
import { db } from "./db";
import { sql } from "drizzle-orm";

async function main() {
    try {
        console.log("Starting manual migration...");

        await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth timestamp`);
        console.log("Added date_of_birth");

        await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS id_number varchar`);
        console.log("Added id_number");

        // Optional: Drop old columns if they exist, but maybe keep them for safety for a moment?
        // The user wanted them removed. Let's drop them to match schema.
        await db.execute(sql`ALTER TABLE users DROP COLUMN IF EXISTS first_name`);
        console.log("Dropped first_name");

        await db.execute(sql`ALTER TABLE users DROP COLUMN IF EXISTS last_name`);
        console.log("Dropped last_name");

        // Ensure 'name' is preserved or defaults are set if it was missing? 
        // It was already there.

        console.log("Migration successful");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

main();
