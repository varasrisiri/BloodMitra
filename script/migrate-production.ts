import pg from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const { Pool } = pg;

export async function runProductionMigration(connectionUrl?: string): Promise<{ success: boolean; details: string[] }> {
  const url = connectionUrl || process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }

  const pool = new Pool({
    connectionString: url,
    ssl: url.includes("neon.tech") ? { rejectUnauthorized: true } : undefined,
  });

  const client = await pool.connect();
  const logs: string[] = [];

  try {
    logs.push("Beginning safe idempotent migration...");

    // 1. Enums
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'blood_group') THEN
          CREATE TYPE "public"."blood_group" AS ENUM('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-');
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_priority') THEN
          CREATE TYPE "public"."request_priority" AS ENUM('normal', 'emergency');
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
          CREATE TYPE "public"."request_status" AS ENUM('pending', 'accepted', 'completed', 'cancelled');
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
          CREATE TYPE "public"."user_role" AS ENUM('user', 'hospital');
        END IF;
      END $$;
    `);
    logs.push("[✓] Verified / created public enums.");

    // 2. Base tables if missing
    await client.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "username" varchar NOT NULL UNIQUE,
        "password" varchar NOT NULL,
        "email" varchar UNIQUE,
        "profile_image_url" varchar,
        "name" varchar NOT NULL,
        "age" integer DEFAULT 18,
        "blood_group" "blood_group",
        "phone" varchar,
        "location" varchar,
        "can_donate" boolean DEFAULT false,
        "availability_status" boolean DEFAULT false,
        "donation_count" integer DEFAULT 0,
        "last_donation_date" timestamp,
        "created_by_hospital" boolean DEFAULT false,
        "role" "user_role" DEFAULT 'user',
        "is_verified" boolean DEFAULT false,
        "verification_status" varchar DEFAULT 'pending',
        "id_document_url" varchar,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );

      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verification_status" varchar DEFAULT 'pending';
    `);
    logs.push("[✓] Verified / updated 'users' table (with verification_status).");

    // 3. donor_documents BYTEA table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "donor_documents" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" varchar NOT NULL UNIQUE,
        "file_name" varchar NOT NULL,
        "mime_type" varchar DEFAULT 'application/pdf' NOT NULL,
        "file_data" bytea NOT NULL,
        "file_size" integer NOT NULL,
        "uploaded_at" timestamp DEFAULT now(),
        CONSTRAINT "donor_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      );

      CREATE INDEX IF NOT EXISTS "idx_donor_documents_user_id" ON "donor_documents"("user_id");
    `);
    logs.push("[✓] Verified / created 'donor_documents' table (BYTEA storage, unique user_id, cascade delete).");

    // 4. password_resets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "password_resets" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" varchar NOT NULL,
        "token" varchar NOT NULL UNIQUE,
        "expires_at" timestamp NOT NULL,
        "used_at" timestamp,
        "created_at" timestamp DEFAULT now(),
        CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      );
    `);
    logs.push("[✓] Verified / created 'password_resets' table.");

    // 5. sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "sid" varchar PRIMARY KEY NOT NULL,
        "sess" jsonb NOT NULL,
        "expire" timestamp NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire");
    `);
    logs.push("[✓] Verified / created 'sessions' table and index.");

    // 6. hospital_blood_stock
    await client.query(`
      CREATE TABLE IF NOT EXISTS "hospital_blood_stock" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "hospital_id" varchar NOT NULL REFERENCES "public"."users"("id"),
        "blood_group" "blood_group" NOT NULL,
        "units_available" integer DEFAULT 0,
        "last_updated" timestamp DEFAULT now()
      );
    `);
    logs.push("[✓] Verified / created 'hospital_blood_stock' table.");

    // 7. blood_requests
    await client.query(`
      CREATE TABLE IF NOT EXISTS "blood_requests" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "requested_by_id" varchar NOT NULL REFERENCES "public"."users"("id"),
        "hospital_id" varchar REFERENCES "public"."users"("id"),
        "blood_group" "blood_group" NOT NULL,
        "location" varchar NOT NULL,
        "status" "request_status" DEFAULT 'pending',
        "matched_donor_id" varchar REFERENCES "public"."users"("id"),
        "priority" "request_priority" DEFAULT 'normal',
        "units_needed" integer DEFAULT 1,
        "notes" varchar,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);
    logs.push("[✓] Verified / created 'blood_requests' table.");

    // 8. announcements
    await client.query(`
      CREATE TABLE IF NOT EXISTS "announcements" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "title" varchar NOT NULL,
        "message" varchar NOT NULL,
        "created_by" varchar NOT NULL REFERENCES "public"."users"("id"),
        "target_blood_group" "blood_group",
        "target_user_id" varchar REFERENCES "public"."users"("id"),
        "related_request_id" varchar REFERENCES "public"."blood_requests"("id"),
        "type" varchar DEFAULT 'general',
        "created_at" timestamp DEFAULT now()
      );
    `);
    logs.push("[✓] Verified / created 'announcements' table.");

    return { success: true, details: logs };
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1]?.endsWith("migrate-production.ts")) {
  runProductionMigration()
    .then((res) => {
      console.log(res.details.join("\n"));
      console.log("\n✅ Migration completed successfully with 0 errors.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Migration failed:", err.message);
      process.exit(1);
    });
}

