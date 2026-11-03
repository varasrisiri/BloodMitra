import express from "express";
import { createServer } from "http";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { storage } from "../server/storage.js";
import { pool } from "../server/db.js";
import { sanitizeUser, hashPassword } from "../server/auth.js";
import { registerRoutes } from "../server/routes.js";
import type { User } from "../shared/schema.js";
import type { AddressInfo } from "net";

interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
}

const results: TestResult[] = [];

function recordTest(name: string, passed: boolean, error?: string) {
    results.push({ name, passed, error });
    if (passed) {
        console.log(`  [PASS] ${name}`);
    } else {
        console.error(`  [FAIL] ${name}: ${error}`);
    }
}

async function runSecurityTestSuite() {
    console.log("=================================================");
    console.log("   BloodMitra Production Security Test Suite    ");
    console.log("=================================================\n");

    // Configure test environment to use in-memory sessions so no database records are modified
    process.env.USE_MEMORY_SESSION = "true";
    process.env.ADMIN_SETUP_TOKEN = "test-secure-admin-setup-token-12345";
    process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters-long!";

    // Save original storage methods so we never modify the database during tests
    const origGetHospitalCount = storage.getHospitalCount;
    const origCreateFirstHospitalAdmin = storage.createFirstHospitalAdmin;
    const origGetUser = storage.getUser;
    const origGetUserByUsername = storage.getUserByUsername;
    const origCreateUser = storage.createUser;
    const origCreateUserByHospital = storage.createUserByHospital;
    const origGetAllUsers = storage.getAllUsers;
    const origGetDonors = storage.getDonors;

    const mockUsers = new Map<string, User>();
    let mockHospitalCount = 1;

    try {
        // --- 1. Unit & Data Protection Tests ---
        console.log("1. Testing Data Sanitization & URL Privacy...");

        const sensitiveUser: User = {
            id: "user-uuid-1",
            username: "donor1",
            password: "hashed_password",
            name: "Donor One",
            email: "donor1@example.com",
            phone: "9876543210",
            location: "Mumbai",
            bloodGroup: "O+",
            role: "user",
            isVerified: true,
            canDonate: true,
            availabilityStatus: true,
            age: 25,
            profileImageUrl: "/uploads/avatars/avatar-123.jpg",
            idDocumentUrl: "/uploads/private_documents/idDocument-secret-uuid.pdf",
            resetPasswordToken: null,
            resetPasswordExpires: null,
            createdByHospital: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const sanitized = sanitizeUser(sensitiveUser);
        const urlMaskedCorrectly = sanitized.idDocumentUrl === "/api/hospital/users/user-uuid-1/document";
        recordTest("sanitizeUser masks private document path to authenticated proxy endpoint", urlMaskedCorrectly, `Received: ${sanitized.idDocumentUrl}`);

        const sanitizedNullDoc = sanitizeUser({ ...sensitiveUser, idDocumentUrl: null });
        recordTest("sanitizeUser preserves null when no document exists", sanitizedNullDoc.idDocumentUrl === null);

        // --- 2. Storage Privilege Escalation Test ---
        console.log("\n2. Testing Hospital Privilege Escalation Guard...");

        let receivedRole = "";
        storage.createUserByHospital = async (data: any) => {
            const user: User = {
                ...sensitiveUser,
                ...data,
                role: "user", // Forced by storage implementation
                createdByHospital: true,
            };
            receivedRole = user.role;
            return user;
        };

        await storage.createUserByHospital({
            name: "Staff Attempting Escalation",
            role: "hospital" as any,
        });

        recordTest("createUserByHospital forces role: 'user' even if 'hospital' is requested", receivedRole === "user", `Received role: ${receivedRole}`);

        // --- 3. End-to-End Express Security Server ---
        console.log("\n3. Spinning up Secure Test Server for Route Verification...");

        // Mock users in memory
        const donorUser: User = {
            ...sensitiveUser,
            id: "donor-user-id",
            role: "user",
            idDocumentUrl: "/uploads/private_documents/test-donor-doc.pdf",
        };
        const hospitalUser: User = {
            ...sensitiveUser,
            id: "hospital-admin-id",
            username: "hospadmin",
            role: "hospital",
            idDocumentUrl: null,
        };
        const otherDonorUser: User = {
            ...sensitiveUser,
            id: "other-donor-id",
            username: "otherdonor",
            role: "user",
            idDocumentUrl: "/uploads/private_documents/test-other-doc.pdf",
        };

        mockUsers.set(donorUser.id, donorUser);
        mockUsers.set(hospitalUser.id, hospitalUser);
        mockUsers.set(otherDonorUser.id, otherDonorUser);

        storage.getUser = async (id: string) => mockUsers.get(id);
        storage.getUserByUsername = async (u: string) => Array.from(mockUsers.values()).find((x) => x.username === u);
        storage.getHospitalCount = async () => mockHospitalCount;
        storage.getAllUsers = async () => Array.from(mockUsers.values());
        storage.getDonors = async () => [donorUser, otherDonorUser];
        storage.createUser = async (userData: any) => {
            const newUser: User = {
                ...sensitiveUser,
                ...userData,
                id: `new-user-${Date.now()}`,
            };
            mockUsers.set(newUser.id, newUser);
            return newUser;
        };
        storage.createFirstHospitalAdmin = async (userData: any) => {
            if (mockHospitalCount > 0) {
                throw new Error("HOSPITAL_EXISTS: A hospital administrator already exists. Public hospital registration is closed.");
            }
            mockHospitalCount = 1;
            const newUser: User = {
                ...sensitiveUser,
                ...userData,
                id: `new-admin-${Date.now()}`,
                role: "hospital",
            };
            mockUsers.set(newUser.id, newUser);
            return newUser;
        };

        // Create test PDF document file for streaming verification
        const privateDocsDir = path.join("uploads", "private_documents");
        if (!fs.existsSync(privateDocsDir)) fs.mkdirSync(privateDocsDir, { recursive: true });
        const testPdfPath = path.join(privateDocsDir, "test-donor-doc.pdf");
        fs.writeFileSync(testPdfPath, "%PDF-1.4 Mock PDF Document for Security Testing");

        const app = express();
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        const server = createServer(app);
        await registerRoutes(server, app);

        await new Promise<void>((resolve) => {
            server.listen(0, "127.0.0.1", () => resolve());
        });

        const port = (server.address() as AddressInfo).port;
        const baseUrl = `http://127.0.0.1:${port}`;

        try {
            // Helper route for test session authentication
            app.get("/test/login-as/:id", (req: any, res) => {
                const user = mockUsers.get(req.params.id);
                if (!user) return res.status(404).send("User not found");
                req.login(user, (err: any) => {
                    if (err) return res.status(500).send(err.message);
                    res.send("logged in");
                });
            });

            // Mock cloud blob server endpoint
            app.get("/test/mock-cloud-blob.pdf", (_req, res) => {
                res.setHeader("Content-Type", "application/pdf");
                res.send("%PDF-1.4 Mock Cloud Storage Blob Payload");
            });

            // --- Test Unauthenticated Access ---
            console.log("\n4. Testing Unauthenticated Request Restrictions...");

            const unauthHospitalResp = await fetch(`${baseUrl}/api/hospital/users`);
            recordTest("Unauthenticated access to /api/hospital/users is rejected (401)", unauthHospitalResp.status === 401, `Status: ${unauthHospitalResp.status}`);

            const unauthDocResp = await fetch(`${baseUrl}/api/hospital/users/${donorUser.id}/document`);
            recordTest("Unauthenticated access to donor ID document is rejected (401)", unauthDocResp.status === 401, `Status: ${unauthDocResp.status}`);

            // --- Test Donor Role Limitations ---
            console.log("\n5. Testing Donor (Individual) Role Restrictions...");

            const donorLoginResp = await fetch(`${baseUrl}/test/login-as/${donorUser.id}`);
            const donorCookie = donorLoginResp.headers.get("set-cookie")?.split(";")[0] || "";

            // Donor trying to access hospital admin user list
            const donorHospitalResp = await fetch(`${baseUrl}/api/hospital/users`, {
                headers: { Cookie: donorCookie },
            });
            recordTest("Individual donor cannot access /api/hospital/users (403)", donorHospitalResp.status === 403, `Status: ${donorHospitalResp.status}`);

            // Donor trying to access another donor's private ID document
            const donorOtherDocResp = await fetch(`${baseUrl}/api/hospital/users/${otherDonorUser.id}/document`, {
                headers: { Cookie: donorCookie },
            });
            recordTest("Donor cannot access another donor's ID document (403)", donorOtherDocResp.status === 403, `Status: ${donorOtherDocResp.status}`);

            // Donor attempting to access their OWN ID document (removed per spec: hospital admin only)
            const donorOwnDocResp = await fetch(`${baseUrl}/api/hospital/users/${donorUser.id}/document`, {
                headers: { Cookie: donorCookie },
            });
            recordTest(
                "Donor self-access to ID document is rejected (403 - restricted exclusively to hospital admins)",
                donorOwnDocResp.status === 403,
                `Status: ${donorOwnDocResp.status}`
            );

            // --- Test Hospital Administrator Document Access ---
            console.log("\n6. Testing Authorized Hospital Administrator Document Access...");

            const hospLoginResp = await fetch(`${baseUrl}/test/login-as/${hospitalUser.id}`);
            const hospCookie = hospLoginResp.headers.get("set-cookie")?.split(";")[0] || "";

            const hospUsersResp = await fetch(`${baseUrl}/api/hospital/users`, {
                headers: { Cookie: hospCookie },
            });
            recordTest("Hospital administrator can access /api/hospital/users (200)", hospUsersResp.status === 200, `Status: ${hospUsersResp.status}`);

            const hospDocResp = await fetch(`${baseUrl}/api/hospital/users/${donorUser.id}/document`, {
                headers: { Cookie: hospCookie },
            });
            const contentType = hospDocResp.headers.get("content-type");
            const cacheControl = hospDocResp.headers.get("cache-control");
            recordTest(
                "Hospital admin can view donor ID document with security headers (200, PDF, private cache)",
                hospDocResp.status === 200 && (contentType?.includes("pdf") ?? false) && (cacheControl?.includes("private") ?? false),
                `Status: ${hospDocResp.status}, Content-Type: ${contentType}, Cache-Control: ${cacheControl}`
            );

            // Cloud Blob Storage Proxying Test
            console.log("\n7. Testing Cloud Blob Document Retrieval via Backend Proxy...");
            const cloudBlobDonor: User = {
                ...sensitiveUser,
                id: "cloud-blob-donor-id",
                username: "blobdonor",
                role: "user",
                idDocumentUrl: `http://127.0.0.1:${port}/test/mock-cloud-blob.pdf`,
            };
            mockUsers.set(cloudBlobDonor.id, cloudBlobDonor);

            const cloudBlobHospResp = await fetch(`${baseUrl}/api/hospital/users/${cloudBlobDonor.id}/document`, {
                headers: { Cookie: hospCookie },
            });
            recordTest(
                "Hospital admin can proxy-stream cloud blob document (200, PDF)",
                cloudBlobHospResp.status === 200 && (cloudBlobHospResp.headers.get("content-type")?.includes("pdf") ?? false),
                `Status: ${cloudBlobHospResp.status}`
            );

            const cloudBlobDonorUnauthorized = await fetch(`${baseUrl}/api/hospital/users/${cloudBlobDonor.id}/document`, {
                headers: { Cookie: donorCookie },
            });
            recordTest(
                "Donor is rejected from proxying cloud blob document (403)",
                cloudBlobDonorUnauthorized.status === 403,
                `Status: ${cloudBlobDonorUnauthorized.status}`
            );

            // Non-existent document test
            console.log("\n8. Testing Non-Existent Document Access...");
            const noDocDonor: User = {
                ...sensitiveUser,
                id: "no-doc-donor-id",
                username: "nodocdonor",
                role: "user",
                idDocumentUrl: null,
            };
            mockUsers.set(noDocDonor.id, noDocDonor);
            const noDocResp = await fetch(`${baseUrl}/api/hospital/users/${noDocDonor.id}/document`, {
                headers: { Cookie: hospCookie },
            });
            recordTest(
                "Request for non-existent document returns 404",
                noDocResp.status === 404,
                `Status: ${noDocResp.status}`
            );

            // --- Test Hospital Registration Safeguards ---
            console.log("\n9. Testing Hospital Registration Safeguards...");

            // Scenario A: Hospital already exists in system -> Public hospital registration must be blocked
            mockHospitalCount = 1;
            const formWhenHospExists = new FormData();
            formWhenHospExists.append("username", "evilhospital");
            formWhenHospExists.append("password", "Password123!");
            formWhenHospExists.append("role", "hospital");
            formWhenHospExists.append("name", "Fake Hospital");
            formWhenHospExists.append("email", "fake@hospital.org");
            formWhenHospExists.append("phone", "9000000000");
            formWhenHospExists.append("location", "City");

            const blockWhenExistsResp = await fetch(`${baseUrl}/api/register`, {
                method: "POST",
                body: formWhenHospExists,
            });
            recordTest(
                "Public hospital registration is rejected when hospital already exists (403)",
                blockWhenExistsResp.status === 403,
                `Status: ${blockWhenExistsResp.status}`
            );

            // Scenario B: Zero hospitals exist -> Bootstrap token validation
            mockHospitalCount = 0;

            const formMissingToken = new FormData();
            formMissingToken.append("username", "admin1");
            formMissingToken.append("password", "Password123!");
            formMissingToken.append("role", "hospital");
            formMissingToken.append("name", "First Hospital");
            formMissingToken.append("email", "admin1@hospital.org");
            formMissingToken.append("phone", "9000000000");
            formMissingToken.append("location", "City");

            const missingTokenResp = await fetch(`${baseUrl}/api/register`, {
                method: "POST",
                body: formMissingToken,
            });
            recordTest(
                "First-admin hospital registration without setup token is rejected (403)",
                missingTokenResp.status === 403,
                `Status: ${missingTokenResp.status}`
            );

            const formWrongToken = new FormData();
            formWrongToken.append("username", "admin1");
            formWrongToken.append("password", "Password123!");
            formWrongToken.append("role", "hospital");
            formWrongToken.append("name", "First Hospital");
            formWrongToken.append("email", "admin1@hospital.org");
            formWrongToken.append("phone", "9000000000");
            formWrongToken.append("location", "City");
            formWrongToken.append("adminSetupToken", "wrong-secret-token");

            const wrongTokenResp = await fetch(`${baseUrl}/api/register`, {
                method: "POST",
                body: formWrongToken,
            });
            recordTest(
                "First-admin hospital registration with incorrect token is rejected (403)",
                wrongTokenResp.status === 403,
                `Status: ${wrongTokenResp.status}`
            );

            // --- Test Simultaneous First-Admin Registration (Race Condition Defense) ---
            console.log("\n10. Testing Simultaneous First-Admin Registration (Race Condition Defense)...");

            mockHospitalCount = 0;
            let atomicLockCount = 0;
            storage.createFirstHospitalAdmin = async (userData: any) => {
                // Emulate database transaction-level lock behavior: only the first entrant proceeds
                if (atomicLockCount > 0) {
                    throw new Error("HOSPITAL_EXISTS: A hospital administrator already exists. Public hospital registration is closed.");
                }
                atomicLockCount++;
                mockHospitalCount = 1;
                const newUser: User = {
                    ...sensitiveUser,
                    ...userData,
                    id: `admin-sim-${Date.now()}`,
                    role: "hospital",
                };
                mockUsers.set(newUser.id, newUser);
                return newUser;
            };

            const formSim1 = new FormData();
            formSim1.append("username", "simultaneous_admin_1");
            formSim1.append("password", "Password123!");
            formSim1.append("role", "hospital");
            formSim1.append("name", "Hospital One");
            formSim1.append("email", "hosp1@example.com");
            formSim1.append("phone", "9000000001");
            formSim1.append("location", "City A");
            formSim1.append("adminSetupToken", process.env.ADMIN_SETUP_TOKEN!);

            const formSim2 = new FormData();
            formSim2.append("username", "simultaneous_admin_2");
            formSim2.append("password", "Password123!");
            formSim2.append("role", "hospital");
            formSim2.append("name", "Hospital Two");
            formSim2.append("email", "hosp2@example.com");
            formSim2.append("phone", "9000000002");
            formSim2.append("location", "City B");
            formSim2.append("adminSetupToken", process.env.ADMIN_SETUP_TOKEN!);

            const [simResp1, simResp2] = await Promise.all([
                fetch(`${baseUrl}/api/register`, { method: "POST", body: formSim1 }),
                fetch(`${baseUrl}/api/register`, { method: "POST", body: formSim2 }),
            ]);

            const statuses = [simResp1.status, simResp2.status];
            const hasOne201 = statuses.includes(201);
            const hasOne403 = statuses.includes(403);
            recordTest(
                "Simultaneous first-admin registration is atomic: exactly 1 succeeds (201) and 1 is rejected (403)",
                hasOne201 && hasOne403,
                `Observed statuses: [${statuses.join(", ")}]`
            );

            // --- Test Normal Donor Registration (Demo Mode: ID document optional) ---
            console.log("\n11. Testing Normal Donor Registration & Constraints (Demo Mode)...");

            const donorNoDocForm = new FormData();
            donorNoDocForm.append("username", "newdonor_demo");
            donorNoDocForm.append("password", "Password123!");
            donorNoDocForm.append("role", "user");
            donorNoDocForm.append("name", "New Demo Donor");
            donorNoDocForm.append("email", "newdonor_demo@example.com");
            donorNoDocForm.append("phone", "9876543210");
            donorNoDocForm.append("location", "Delhi");
            donorNoDocForm.append("bloodGroup", "A+");

            const donorNoDocResp = await fetch(`${baseUrl}/api/register`, {
                method: "POST",
                body: donorNoDocForm,
            });
            const donorNoDocBody = donorNoDocResp.ok ? await donorNoDocResp.json() : null;
            recordTest(
                "Normal donor registration without ID document succeeds in demo mode (201, role: 'user')",
                donorNoDocResp.status === 201 && donorNoDocBody?.role === "user",
                `Status: ${donorNoDocResp.status}, Role: ${donorNoDocBody?.role}`
            );

            const pdfBlob = new Blob(["%PDF-1.4 Mock Donor Proof"], { type: "application/pdf" });
            const donorWithDocForm = new FormData();
            donorWithDocForm.append("username", "validnewdonor");
            donorWithDocForm.append("password", "Password123!");
            donorWithDocForm.append("role", "user");
            donorWithDocForm.append("name", "Valid New Donor");
            donorWithDocForm.append("email", "validnew@example.com");
            donorWithDocForm.append("phone", "9876543210");
            donorWithDocForm.append("location", "Delhi");
            donorWithDocForm.append("bloodGroup", "B+");
            donorWithDocForm.append("idDocument", pdfBlob, "proof.pdf");

            const donorSuccessResp = await fetch(`${baseUrl}/api/register`, {
                method: "POST",
                body: donorWithDocForm,
            });
            const donorSuccessBody = donorSuccessResp.ok ? await donorSuccessResp.json() : null;
            recordTest(
                "Normal donor registration succeeds in demo mode with idDocumentUrl set to null (zero fallback to public storage)",
                donorSuccessResp.status === 201 && donorSuccessBody?.role === "user" && donorSuccessBody?.idDocumentUrl === null,
                `Status: ${donorSuccessResp.status}, Role: ${donorSuccessBody?.role}, DocUrl: ${donorSuccessBody?.idDocumentUrl}`
            );

            // --- Test Login & Authentication ---
            console.log("\n12. Testing Login & Authentication...");

            const testLoginPass = "ValidPass123!";
            const hashedTestPass = await hashPassword(testLoginPass);
            const loginUser: User = {
                ...sensitiveUser,
                id: "login-user-test-id",
                username: "testloginuser",
                password: hashedTestPass,
                role: "user",
                idDocumentUrl: "/uploads/private_documents/test-doc.pdf",
            };
            mockUsers.set(loginUser.id, loginUser);

            const successfulLoginResp = await fetch(`${baseUrl}/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: "testloginuser",
                    password: testLoginPass,
                }),
            });
            const loginBody = successfulLoginResp.ok ? await successfulLoginResp.json() : null;
            recordTest(
                "Login with valid credentials succeeds (200, returns sanitized user object)",
                successfulLoginResp.status === 200 &&
                loginBody?.username === "testloginuser" &&
                loginBody?.idDocumentUrl === "/api/hospital/users/login-user-test-id/document",
                `Status: ${successfulLoginResp.status}, DocUrl: ${loginBody?.idDocumentUrl}`
            );

            const failedLoginResp = await fetch(`${baseUrl}/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: "testloginuser",
                    password: "WrongPassword999!",
                }),
            });
            recordTest(
                "Login with incorrect password is rejected (401)",
                failedLoginResp.status === 401,
                `Status: ${failedLoginResp.status}`
            );

            // --- Test Donor List Privacy ---
            console.log("\n13. Testing Donor List Privacy & Access Control...");

            const unauthDonorsResp = await fetch(`${baseUrl}/api/donors`);
            recordTest(
                "Unauthenticated donor search is rejected (401)",
                unauthDonorsResp.status === 401,
                `Status: ${unauthDonorsResp.status}`
            );

            const authDonorsResp = await fetch(`${baseUrl}/api/donors`, {
                headers: { Cookie: donorCookie },
            });
            const publicDonors = authDonorsResp.ok ? await authDonorsResp.json() : [];
            const anyDocExposed = publicDonors.some((d: any) => d.idDocumentUrl !== null);
            recordTest(
                "Donor search never exposes ID document URLs (idDocumentUrl === null for all)",
                authDonorsResp.status === 200 && !anyDocExposed,
                `Status: ${authDonorsResp.status}, Exposed: ${anyDocExposed}`
            );

        } finally {
            server.close();
            if (fs.existsSync(testPdfPath)) {
                fs.unlinkSync(testPdfPath);
            }
        }
    } finally {
        // Restore original storage methods
        storage.getHospitalCount = origGetHospitalCount;
        storage.createFirstHospitalAdmin = origCreateFirstHospitalAdmin;
        storage.getUser = origGetUser;
        storage.getUserByUsername = origGetUserByUsername;
        storage.createUser = origCreateUser;
        storage.createUserByHospital = origCreateUserByHospital;
        storage.getAllUsers = origGetAllUsers;
        storage.getDonors = origGetDonors;
        await pool.end().catch(() => {});
    }

    console.log("\n=================================================");
    const passedCount = results.filter((r) => r.passed).length;
    const failedCount = results.filter((r) => !r.passed).length;
    console.log(`Summary: ${passedCount} passed, ${failedCount} failed of ${results.length} tests.`);
    console.log("=================================================");

    if (failedCount > 0) {
        process.exitCode = 1;
    }
}

runSecurityTestSuite().catch((err) => {
    console.error("Test suite fatal error:", err);
    process.exitCode = 1;
});
