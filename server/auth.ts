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

// Configure multer for PDF uploads
const uploadDir = "uploads";
if (!process.env.VERCEL && !fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const multerStorage = multer.memoryStorage();

const upload = multer({
    storage: multerStorage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            cb(new Error("Only PDF files are allowed"));
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

async function uploadFile(file: Express.Multer.File): Promise<string> {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(`uploads/${Date.now()}-${file.originalname}`, file.buffer, { access: 'public' });
        return blob.url;
    } else {
        if (process.env.VERCEL) {
            throw new Error("Local file uploads are not supported on Vercel. Please configure BLOB_READ_WRITE_TOKEN.");
        }
        const filename = `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`;
        const filePath = path.join(uploadDir, filename);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        fs.writeFileSync(filePath, file.buffer);
        return `/uploads/${filename}`;
    }
}

export async function setupAuth(app: Express) {
    const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
    const sessionSecret = process.env.SESSION_SECRET;
    if (process.env.NODE_ENV === "production" && (!sessionSecret || sessionSecret.length < 32)) {
        throw new Error("SESSION_SECRET must be configured with at least 32 characters in production.");
    }

    const pgStore = connectPg(session);

    // Ensure password_resets table exists in the database
    await pool.query(`
        CREATE TABLE IF NOT EXISTS password_resets (
            id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token varchar NOT NULL UNIQUE,
            expires_at timestamp NOT NULL,
            used_at timestamp,
            created_at timestamp DEFAULT now()
        );
    `);

    const sessionStore = new pgStore({
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
            let bloodGroup = req.body.bloodGroup;
            if (typeof bloodGroup === 'string') {
                bloodGroup = bloodGroup.trim();
            }
            if (!bloodGroup || bloodGroup === "" || bloodGroup === "null" || bloodGroup === "undefined") {
                bloodGroup = null;
            }

            const data = {
                ...req.body,
                bloodGroup,
                idDocumentUrl: req.file ? await uploadFile(req.file) : null,
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
                password: hashedPassword,
                isVerified: false,
                age: 18, // Default age or remove if not needed
            };
            const user = await storage.createUser(userData);

            req.login(user, (err) => {
                if (err) return next(err);
                res.status(201).json(user);
            });
        } catch (err) {
            next(err);
        }
    });

    // Profile picture upload endpoint
    app.post("/api/users/me/avatar", isAuthenticated, uploadImage.single("avatar"), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).send("No file uploaded");
            }

            const userId = (req.user as any).id;
            const profileImageUrl = await uploadFile(req.file);

            const user = await storage.updateUser(userId, { profileImageUrl });
            res.json(user);
        } catch (error) {
            console.error("Error uploading avatar:", error);
            res.status(500).send("Failed to upload avatar");
        }
    });

    // Serve static files from uploads directory
    app.use("/uploads", express.static("uploads"));

    app.post("/api/login", (req, res, next) => {
        passport.authenticate("local", (err: any, user: any, info: any) => {
            if (err) return next(err);
            if (!user) return res.status(401).send("Invalid username or password");
            req.login(user, (err) => {
                if (err) return next(err);
                res.status(200).json(user);
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
        res.json(req.user);
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
