import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import express, { type Express, Request, Response, NextFunction, RequestHandler } from "express";
import crypto from "crypto";
import { promisify } from "util";
import connectPg from "connect-pg-simple";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage.js";
import { insertUserSchema, type User } from "../shared/schema.js";
import { put } from "@vercel/blob";
import { db, pool } from "./db.js";
import { passwordResets, users } from "../shared/schema.js";
import { eq, and, gt, isNull, ilike } from "drizzle-orm";
import { isEmailConfigured, sendPasswordResetEmail } from "./email.js";

// Configure upload directories
const uploadDir = "uploads";
const avatarsDir = path.join(uploadDir, "avatars");
const privateDocsDir = path.join(uploadDir, "private_documents");

if (!process.env.VERCEL) {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir);
    if (!fs.existsSync(privateDocsDir)) fs.mkdirSync(privateDocsDir);
}

const multerStorage = multer.memoryStorage();

const upload = multer({
    storage: multerStorage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            const err: any = new Error("Only PDF files are allowed");
            err.status = 400;
            cb(err);
        }
    },
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB
    },
});

const scrypt = promisify(crypto.scrypt);

export async function hashPassword(password: string) {
    const salt = crypto.randomBytes(16).toString("hex");
    const buf = (await scrypt(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scrypt(supplied, salt, 64)) as Buffer;
    return crypto.timingSafeEqual(hashedBuf, suppliedBuf);
}

const uploadImage = multer({
    storage: multerStorage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed"));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
});

// Upload public user avatars (photos)
async function uploadAvatar(file: Express.Multer.File): Promise<string> {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(`avatars/${Date.now()}-${file.originalname}`, file.buffer, { access: 'public' });
        return blob.url;
    } else {
        if (process.env.VERCEL) {
            throw new Error("Local file uploads are not supported on Vercel. Please configure BLOB_READ_WRITE_TOKEN.");
        }
        const filename = `avatar-${Date.now()}${path.extname(file.originalname)}`;
        const filePath = path.join(avatarsDir, filename);
        fs.writeFileSync(filePath, file.buffer);
        return `/uploads/avatars/${filename}`;
    }
}

// Upload private donor ID document to PostgreSQL (BYTEA storage)
async function uploadPrivateDocument(userId: string, file: Express.Multer.File): Promise<string> {
    await storage.saveDonorDocument({
        userId,
        fileName: file.originalname,
        mimeType: file.mimetype || "application/pdf",
        fileData: file.buffer,
        fileSize: file.size,
    });
    return `db://donor_documents/${userId}`;
}

export function sanitizeUser(user: any) {
    if (!user) return user;
    return {
        ...user,
        // Never expose raw storage paths or external blob URLs.
        // Return authenticated proxy endpoint only when an ID document exists.
        idDocumentUrl: user.idDocumentUrl ? `/api/hospital/users/${user.id}/document` : null,
    };
}

export async function setupAuth(app: Express) {
    const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
    const sessionSecret = process.env.SESSION_SECRET;
    if (process.env.NODE_ENV === "production" && (!sessionSecret || sessionSecret.length < 32)) {
        throw new Error("SESSION_SECRET must be configured with at least 32 characters in production.");
    }

    const pgStore = connectPg(session);

    const sessionStore = process.env.USE_MEMORY_SESSION === "true"
        ? new session.MemoryStore()
        : new pgStore({
            conString: process.env.DATABASE_URL,
            createTableIfMissing: true,
            ttl: sessionTtl,
            tableName: "sessions",
        });

    app.use(
        session({
            secret: sessionSecret || "bloodmitra-local-development-secret",
            resave: false,
            saveUninitialized: false,
            store: sessionStore,
            cookie: {
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: sessionTtl,
            },
        }),
    );

    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(
        new LocalStrategy(async (username, password, done) => {
            try {
                const user = await storage.getUserByUsername(username);
                if (!user || !(await comparePasswords(password, user.password))) {
                    return done(null, false);
                }
                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }),
    );

    passport.serializeUser((user: any, done) => done(null, user.id));
    passport.deserializeUser(async (id: string, done) => {
        try {
            const user = await storage.getUser(id);
            done(null, user);
        } catch (err) {
            done(err);
        }
    });

    app.post("/api/register", upload.single("idDocument"), async (req, res, next) => {
        try {
            const requestedRole = req.body.role;

            // Security Check: Hospital Role Registration
            if (requestedRole === "hospital") {
                const hospitalCount = await storage.getHospitalCount();

                // If a hospital admin already exists, public hospital registration is permanently locked
                if (hospitalCount > 0) {
                    return res.status(403).json({
                        message: "Public hospital registration is disabled. Additional hospital administrators can only be created by an authorized administrator."
                    });
                }
            }

            // ID Document PDF Validation for Individual Registration
            if (requestedRole !== "hospital") {
                if (!req.file) {
                    return res.status(400).json({ message: "ID Document (PDF, maximum 2MB) is required for donor registration." });
                }
                if (req.file.size > 2 * 1024 * 1024) {
                    return res.status(400).json({ message: "ID Document must be less than 2MB in size." });
                }
                const ext = path.extname(req.file.originalname).toLowerCase();
                if (ext !== ".pdf" || req.file.mimetype !== "application/pdf") {
                    return res.status(400).json({ message: "Only PDF files are allowed for ID Document." });
                }
                if (req.file.buffer.length < 4 || req.file.buffer.subarray(0, 4).toString() !== "%PDF") {
                    return res.status(400).json({ message: "The uploaded file is not a valid PDF document." });
                }
            }

            let bloodGroup = req.body.bloodGroup;
            if (typeof bloodGroup === 'string') {
                bloodGroup = bloodGroup.trim();
            }
            if (!bloodGroup || bloodGroup === "" || bloodGroup === "null" || bloodGroup === "undefined") {
                bloodGroup = null;
            }

            const { adminSetupToken: _token, ...cleanBody } = req.body;
            const data = {
                ...cleanBody,
                role: requestedRole === "hospital" ? "hospital" : "user",
                bloodGroup,
                idDocumentUrl: req.file ? "db://pending" : null,
            };

            const result = insertUserSchema.safeParse(data);
            if (!result.success) {
                console.warn("Registration data failed validation.");
                return res.status(400).json(result.error);
            }

            const existingUser = await storage.getUserByUsername(result.data.username);
            if (existingUser) {
                return res.status(400).send("Username already exists");
            }

            const hashedPassword = await hashPassword(result.data.password);

            const userData = {
                ...result.data,
                role: requestedRole === "hospital" ? "hospital" : "user",
                password: hashedPassword,
                isVerified: requestedRole === "hospital", // First-admin hospital is verified by default
                age: result.data.age || 18,
            };
            let user: User;
            try {
                if (requestedRole === "hospital") {
                    user = await storage.createFirstHospitalAdmin(userData);
                } else {
                    user = await storage.createUser(userData);
                    if (req.file) {
                        const docUrl = await uploadPrivateDocument(user.id, req.file);
                        const updated = await storage.updateUser(user.id, { idDocumentUrl: docUrl });
                        if (updated) user = updated;
                    }
                }
            } catch (createErr: any) {
                if (createErr?.message && createErr.message.includes("HOSPITAL_EXISTS")) {
                    return res.status(403).json({
                        message: "Public hospital registration is disabled. Additional hospital administrators can only be created by an authorized administrator."
                    });
                }
                throw createErr;
            }

            req.login(user, (err) => {
                if (err) return next(err);
                res.status(201).json(sanitizeUser(user));
            });
        } catch (err) {
            next(err);
        }
    });

    // Hospital setup status endpoint (public check for registration UI)
    app.get("/api/auth/hospital-status", async (_req, res) => {
        try {
            const count = await storage.getHospitalCount();
            res.json({
                hospitalCount: count,
                registrationOpen: count === 0,
            });
        } catch {
            res.status(500).json({ message: "Failed to check hospital status" });
        }
    });

    // Profile picture upload endpoint
    app.post("/api/users/me/avatar", isAuthenticated, uploadImage.single("avatar"), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).send("No file uploaded");
            }

            const userId = (req.user as any).id;
            const profileImageUrl = await uploadAvatar(req.file);

            const user = await storage.updateUser(userId, { profileImageUrl });
            res.json(sanitizeUser(user));
        } catch (error) {
            console.error("Error uploading avatar:", error);
            res.status(500).send("Failed to upload avatar");
        }
    });

    // Serve public avatars only. Private ID documents are never served statically.
    app.use("/uploads/avatars", express.static(avatarsDir));

    app.post("/api/login", (req, res, next) => {
        passport.authenticate("local", (err: any, user: any, info: any) => {
            if (err) return next(err);
            if (!user) return res.status(401).send("Invalid username or password");
            req.login(user, (err) => {
                if (err) return next(err);
                res.status(200).json(sanitizeUser(user));
            });
        })(req, res, next);
    });

    app.post("/api/logout", (req, res, next) => {
        req.logout((err) => {
            if (err) return next(err);
            req.session.destroy((err) => {
                if (err) return next(err);
                res.clearCookie("connect.sid");
                res.sendStatus(200);
            });
        });
    });

    app.get("/api/auth/user", (req, res) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        res.json(sanitizeUser(req.user));
    });

    // ─── Forgot Password ────────────────────────────────────────────────────────

    /**
     * Hashes a raw reset token with SHA-256 for secure database storage.
     * Prevents database leak from compromising active reset tokens.
     */
    function hashResetToken(token: string): string {
        return crypto.createHash("sha256").update(token).digest("hex");
    }

    /**
     * POST /api/auth/forgot-password
     * Body: { email: string }
     * Looks up account by email, creates a one-hour time-limited reset token,
     * stores only the hashed token in the database, and sends an email.
     * Always responds with 200 to avoid exposing whether the email exists in the database.
     */
    app.post("/api/auth/forgot-password", async (req, res) => {
        try {
            const { email } = req.body;
            if (!email || typeof email !== "string") {
                return res.status(400).json({ message: "Email is required" });
            }

            if (!isEmailConfigured()) {
                console.warn("[BloodMitra Email] Password reset unavailable: SMTP configuration is missing or invalid.");
                return res.status(503).json({
                    message: "Password reset is temporarily unavailable. Please try again later.",
                });
            }

            const configuredBaseUrl = process.env.APP_BASE_URL ||
                (process.env.NODE_ENV === "production" ? undefined : "http://localhost:5000");
            if (!configuredBaseUrl) {
                throw new Error("APP_BASE_URL must be configured in production.");
            }
            const baseUrl = new URL(configuredBaseUrl);
            if (
                !["http:", "https:"].includes(baseUrl.protocol) ||
                baseUrl.username ||
                baseUrl.password ||
                baseUrl.search ||
                baseUrl.hash ||
                (process.env.NODE_ENV === "production" && baseUrl.protocol !== "https:")
            ) {
                throw new Error("APP_BASE_URL must be a valid HTTPS application URL in production.");
            }

            // Find user by email (case-insensitive)
            const [user] = await db
                .select()
                .from(users)
                .where(ilike(users.email, email.trim()));

            // Always return generic success to prevent email account enumeration
            if (!user) {
                return res.status(200).json({
                    message: "If an account with that email exists, a password reset link has been sent.",
                });
            }

            // Invalidate any existing unused tokens for this user
            await db
                .update(passwordResets)
                .set({ usedAt: new Date() })
                .where(
                    and(
                        eq(passwordResets.userId, user.id),
                        isNull(passwordResets.usedAt)
                    )
                );

            // Generate cryptographically secure random token (sent in the link)
            const rawToken = crypto.randomBytes(32).toString("hex");

            // Store ONLY the SHA-256 hashed token in the database for security
            const hashedToken = hashResetToken(rawToken);

            // Set one-hour expiration time
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

            await db.insert(passwordResets).values({
                userId: user.id,
                token: hashedToken,
                expiresAt,
            });

            const resetUrl = `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, "")}/reset-password?token=${rawToken}`;

            const emailResult = await sendPasswordResetEmail(user.email!, resetUrl);
            if (!emailResult.success) {
                await db
                    .update(passwordResets)
                    .set({ usedAt: new Date() })
                    .where(eq(passwordResets.token, hashedToken));
            }

            return res.status(200).json({
                message: "If an account with that email exists, a password reset link has been sent.",
            });
        } catch (err) {
            console.error("Forgot password error:", err);
            return res.status(500).json({ message: "An error occurred. Please try again." });
        }
    });

    /**
     * POST /api/auth/reset-password
     * Body: { token: string, newPassword: string }
     * Validates the token against stored hash, checks expiry and reuse,
     * hashes the new password using scrypt, updates the user, and invalidates the token.
     */
    app.post("/api/auth/reset-password", async (req, res) => {
        try {
            const { token, newPassword } = req.body;

            if (!token || typeof token !== "string") {
                return res.status(400).json({ message: "Reset token is required" });
            }
            if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
                return res.status(400).json({ message: "Password must be at least 8 characters" });
            }

            if (!/^[a-f0-9]{64}$/i.test(token)) {
                return res.status(400).json({ message: "This reset link is invalid." });
            }

            const hashedToken = hashResetToken(token);
            const [resetRecord] = await db
                .select()
                .from(passwordResets)
                .where(eq(passwordResets.token, hashedToken));

            if (!resetRecord) {
                return res.status(400).json({ message: "This reset link is invalid." });
            }

            if (resetRecord.usedAt) {
                return res.status(400).json({ message: "This reset link has already been used." });
            }

            if (new Date() > resetRecord.expiresAt) {
                return res.status(400).json({ message: "This reset link has expired." });
            }

            // Hash the new password using the existing password-hashing approach (scrypt)
            const hashedPassword = await hashPassword(newPassword);

            const resetAt = new Date();
            const resetCompleted = await db.transaction(async (transaction) => {
                const [claimedToken] = await transaction
                    .update(passwordResets)
                    .set({ usedAt: resetAt })
                    .where(
                        and(
                            eq(passwordResets.id, resetRecord.id),
                            isNull(passwordResets.usedAt),
                            gt(passwordResets.expiresAt, resetAt),
                        )
                    )
                    .returning({ id: passwordResets.id });

                if (!claimedToken) {
                    return false;
                }

                await transaction
                    .update(users)
                    .set({ password: hashedPassword, updatedAt: resetAt })
                    .where(eq(users.id, resetRecord.userId));

                return true;
            });

            if (!resetCompleted) {
                return res.status(400).json({ message: "This reset link is invalid, expired, or already used." });
            }

            return res.status(200).json({ message: "Password reset successfully. You can now log in with your new password." });
        } catch (err) {
            console.error("Reset password error:", err);
            return res.status(500).json({ message: "An error occurred. Please try again." });
        }
    });

    /**
     * GET /api/auth/validate-reset-token?token=...
     * Returns 200 if token is valid and unused, 400 otherwise with a clear message.
     */
    app.get("/api/auth/validate-reset-token", async (req, res) => {
        try {
            const { token } = req.query;
            if (!token || typeof token !== "string") {
                return res.status(400).json({ valid: false, message: "Token is required" });
            }

            if (!/^[a-f0-9]{64}$/i.test(token)) {
                return res.status(400).json({ valid: false, message: "This reset link is invalid." });
            }

            const hashedToken = hashResetToken(token);
            const [resetRecord] = await db
                .select()
                .from(passwordResets)
                .where(eq(passwordResets.token, hashedToken));

            if (!resetRecord) {
                return res.status(400).json({ valid: false, message: "This reset link is invalid." });
            }

            if (resetRecord.usedAt) {
                return res.status(400).json({ valid: false, message: "This reset link has already been used." });
            }

            if (new Date() > resetRecord.expiresAt) {
                return res.status(400).json({ valid: false, message: "This reset link has expired." });
            }

            return res.status(200).json({ valid: true });
        } catch (err) {
            console.error("Validate token error:", err);
            return res.status(500).json({ valid: false, message: "An error occurred." });
        }
    });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).send("Unauthorized");
};
