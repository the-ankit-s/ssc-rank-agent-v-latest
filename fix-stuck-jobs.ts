
import "dotenv/config";
import { db } from "./lib/db";
import { jobRuns } from "./lib/db/schema";
import { eq, and } from "drizzle-orm";

async function main() {
    console.log("🔍 Checking for stuck jobs...");

    // 1. Find running jobs
    const runningJobs = await db
        .select()
        .from(jobRuns)
        .where(eq(jobRuns.status, "running"));

    console.log(`Found ${runningJobs.length} running jobs.`);

    if (runningJobs.length === 0) {
        console.log("✅ No stuck jobs found.");
        process.exit(0);
    }

    for (const job of runningJobs) {
        console.log(`   - [${job.id}] ${job.jobType} (Started: ${job.startedAt})`);
    }

    // 2. Fix them?
    if (process.argv.includes("--fix")) {
        console.log("\n🛠️ Fixing stuck jobs (marking as failed)...");
        for (const job of runningJobs) {
            await db
                .update(jobRuns)
                .set({
                    status: "failed",
                    completedAt: new Date(),
                    errorMessage: "Manually marked as failed by fix-stuck-jobs script"
                })
                .where(eq(jobRuns.id, job.id));
            console.log(`   - Fixed Job ${job.id}`);
        }
        console.log("✅ All stuck jobs cleared.");
    } else {
        console.log("\n⚠️ To clear these jobs, run with --fix");
    }

    process.exit(0);
}

main().catch(console.error);
