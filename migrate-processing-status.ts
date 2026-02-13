import "dotenv/config";
import { db } from "./lib/db";
import { sql } from "drizzle-orm";

async function migrate() {
    console.log("🔧 Adding processing_status column...");

    await db.execute(sql`
    ALTER TABLE submissions 
    ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending'
  `);

    console.log("📝 Backfilling existing rows as 'ready'...");

    await db.execute(sql`
    UPDATE submissions 
    SET processing_status = 'ready' 
    WHERE processing_status IS NULL OR processing_status = 'pending'
  `);

    console.log("✅ Migration complete: processing_status column added and backfilled");
    process.exit(0);
}

migrate().catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
});
