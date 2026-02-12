
import "dotenv/config";
import { db } from "@/lib/db/client";
import { normalizeScores } from "@/lib/jobs/definitions/normalization";

async function main() {
    console.log("Running normalization test...");
    // Mock job ID 0
    await normalizeScores(0);
    console.log("Done.");
    process.exit(0);
}

main().catch(console.error);
