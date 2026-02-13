import "dotenv/config";
import { db } from "../lib/db/client";
import { submissions } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import { runBatchProcessing } from "../lib/services/batch-processing";

async function main() {
    console.log("[Script] Resetting submission 631780 to pending...");

    await db.update(submissions).set({
        processingStatus: "pending",
        normalizedScore: null,
        overallRank: null,
        categoryRank: null,
        shiftRank: null,
        stateRank: null,
        overallPercentile: null,
        categoryPercentile: null,
        shiftPercentile: null,
    }).where(eq(submissions.id, 631780));

    console.log("[Script] Done. Running batch now...");

    const result = await runBatchProcessing();
    console.log("[Script] Batch result:", JSON.stringify(result, null, 2));

    // Check the submission after
    const [sub] = await db.select({
        id: submissions.id,
        status: submissions.processingStatus,
        normalizedScore: submissions.normalizedScore,
        overallRank: submissions.overallRank,
        categoryRank: submissions.categoryRank,
        rawScore: submissions.rawScore,
    }).from(submissions).where(eq(submissions.id, 631780));

    console.log("[Script] After batch:", JSON.stringify(sub, null, 2));
    process.exit(0);
}

main().catch(e => { console.error("[Script] Error:", e); process.exit(1); });
