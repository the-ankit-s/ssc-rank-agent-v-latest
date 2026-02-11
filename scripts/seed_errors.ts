
import "dotenv/config";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Seeding errors...");

    // Simulate different error scenarios
    const scenarios = [
        { msg: "Connection timeout to redis:6379", comp: "CacheService", count: 5 },
        { msg: "Invalid API Key provided", comp: "AuthMiddleware", count: 12 },
        { msg: "Division by zero in calculation module", comp: "RankCalculator", count: 1 },
        { msg: "External API 500: gateway_timeout", comp: "ExamParser", count: 3 },
    ];

    for (const s of scenarios) {
        for (let i = 0; i < s.count; i++) {
            await logger.error({
                component: s.comp,
                message: s.msg,
                details: {
                    stack: `Error: ${s.msg}\n    at ${s.comp}.process (app/services/${s.comp}.ts:42:15)\n    at async job (app/jobs/runner.ts:10:5)`,
                    context: { attempt: i + 1 }
                },
                ip: "192.168.1." + Math.floor(Math.random() * 255)
            });
            // Small delay to vary timestamps
            await new Promise(r => setTimeout(r, 10));
        }
    }

    console.log("Errors seeded successfully.");
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
