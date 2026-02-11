
import "dotenv/config";
import { db } from "./client";
import { sql } from "drizzle-orm";
import { seedDatabase } from "./seed";

async function resetDatabase() {
    console.log("⚠️  STARTING DATABASE RESET...");
    console.log("    This will delete ALL data.");

    try {
        // Truncate all tables
        // Using CASCADE to handle foreign keys
        const tables = [
            "submissions",
            "shifts",
            "exams",
            "cutoffs",
            "daily_analytics",
            "score_distribution",
            "api_metrics",
            "parser_stats",
            "result_views",
            "user_feedback",
            "job_runs",
            "scheduled_jobs",
            "notifications",
            "audit_logs",
            "admin_sessions",
            "admin_users",
            "system_settings",
            "system_logs",
        ];

        console.log("🗑️  Truncating tables...");

        // Disable triggers if necessary, but TRUNCATE CASCADE usually works fine
        for (const table of tables) {
            try {
                await db.execute(sql.raw(`TRUNCATE TABLE "${table}" CASCADE;`));
            } catch (e) {
                // Ignore if table doesn't exist (e.g. slight schema mismatch), but log it
                // console.warn(`   Could not truncate ${table}: ${e}`);
            }
        }

        console.log("✅ Tables truncated.");

        // Run Seed
        console.log("\n🌱 Re-seeding database...");
        await seedDatabase();

        console.log("\n✨ System Reset Complete!");

    } catch (error) {
        console.error("❌ Reset failed:", error);
        process.exit(1);
    }
}

if (require.main === module) {
    resetDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
