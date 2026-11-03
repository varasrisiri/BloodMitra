import readline from "readline";
import { storage } from "../server/storage.js";
import { hashPassword } from "../server/auth.js";
import { pool } from "../server/db.js";

function readPasswordPrompt(promptText: string): Promise<string> {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        process.stdout.write(promptText);
        let password = "";

        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
            process.stdin.resume();
            const onData = (chunk: Buffer) => {
                const str = chunk.toString();
                for (const char of str) {
                    if (char === "\n" || char === "\r" || char === "\u0004") {
                        process.stdin.setRawMode(false);
                        process.stdin.pause();
                        process.stdin.removeListener("data", onData);
                        process.stdout.write("\n");
                        rl.close();
                        resolve(password);
                        return;
                    } else if (char === "\u0003") {
                        process.stdout.write("\n");
                        process.exit(1);
                    } else if (char === "\b" || char === "\x7f") {
                        if (password.length > 0) {
                            password = password.slice(0, -1);
                        }
                    } else {
                        password += char;
                    }
                }
            };
            process.stdin.on("data", onData);
        } else {
            rl.question("", (answer) => {
                rl.close();
                resolve(answer.trim());
            });
        }
    });
}

async function main() {
    const args = process.argv.slice(2);
    const getArg = (name: string): string | undefined => {
        const flag = `--${name}=`;
        const item = args.find((a) => a.startsWith(flag));
        if (item) return item.slice(flag.length);
        const index = args.indexOf(`--${name}`);
        if (index !== -1 && index + 1 < args.length) return args[index + 1];
        return undefined;
    };

    const username = getArg("username") || process.env.ADMIN_USERNAME;
    const cliPassword = getArg("password");
    if (cliPassword) {
        console.warn("⚠️  SECURITY NOTICE: Supplying passwords via command-line flags (--password) can expose credentials in process lists (ps/tasklist) and shell history.");
        console.warn("   Recommended: Set the ADMIN_PASSWORD environment variable or enter it interactively.");
    }

    let password = cliPassword || process.env.ADMIN_PASSWORD;
    const name = getArg("name") || process.env.ADMIN_NAME || "Hospital Admin";
    const email = getArg("email") || process.env.ADMIN_EMAIL || "admin@hospital.org";
    const phone = getArg("phone") || process.env.ADMIN_PHONE || "9999999999";
    const location = getArg("location") || process.env.ADMIN_LOCATION || "Central City";

    if (!username) {
        console.error("Usage: npm run create:admin -- --username=<user> [--name=<name>] [--email=<email>] [--phone=<phone>] [--location=<loc>]");
        console.error("Or configure environment variables: ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, ADMIN_LOCATION.");
        process.exit(1);
    }

    if (!password) {
        if (process.stdin.isTTY) {
            password = await readPasswordPrompt("Enter admin password (min 6 characters): ");
        } else {
            console.error("Error: Password not provided. Set ADMIN_PASSWORD environment variable or run in an interactive terminal.");
            process.exit(1);
        }
    }

    if (!password || password.length < 6) {
        console.error("Error: Password must be at least 6 characters.");
        process.exit(1);
    }

    try {
        const existing = await storage.getUserByUsername(username);
        if (existing) {
            console.error(`Error: User '${username}' already exists.`);
            process.exit(1);
        }

        const hashedPassword = await hashPassword(password);
        // Wipe local password string from memory
        password = "";

        const hospitalCount = await storage.getHospitalCount();
        let adminUser;

        if (hospitalCount === 0) {
            adminUser = await storage.createFirstHospitalAdmin({
                username,
                password: hashedPassword,
                name,
                email,
                phone,
                location,
                role: "hospital",
                isVerified: true,
                canDonate: false,
                availabilityStatus: false,
                age: 30,
                bloodGroup: null,
                idDocumentUrl: null,
            });
        } else {
            adminUser = await storage.createUser({
                username,
                password: hashedPassword,
                name,
                email,
                phone,
                location,
                role: "hospital",
                isVerified: true,
                canDonate: false,
                availabilityStatus: false,
                age: 30,
                bloodGroup: null,
                idDocumentUrl: null,
            });
        }

        console.log(`Successfully created hospital administrator account [ID: ${adminUser.id}, Username: ${adminUser.username}, Name: ${adminUser.name}].`);
        await pool.end().catch(() => {});
        process.exit(0);
    } catch (err) {
        console.error("Failed to create hospital administrator:", err instanceof Error ? err.message : err);
        await pool.end().catch(() => {});
        process.exit(1);
    }
}

main();
