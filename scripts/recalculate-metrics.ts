import "dotenv/config";
import { db } from "@/lib/db/client";
import { exams, shifts, submissions } from "@/lib/db/schema";
import { count, eq, sql } from "drizzle-orm";

async function main() {
    console.log("Starting metrics recalculation...");

    // 1. Recalculate Exam Stats
    const allExams = await db.select().from(exams);
    console.log(`Found ${allExams.length} exams.`);

    for (const exam of allExams) {
        // Count actual submissions
        const [subCount] = await db
            .select({ count: count() })
            .from(submissions)
            .where(eq(submissions.examId, exam.id));

        // Count actual shifts
        const [shiftCount] = await db
            .select({ count: count() })
            .from(shifts)
            .where(eq(shifts.examId, exam.id));

        // Update exam
        await db
            .update(exams)
            .set({
                totalSubmissions: subCount.count,
                totalShifts: shiftCount.count,
            })
            .where(eq(exams.id, exam.id));

        console.log(
            `Updated Exam ${exam.slug}: ${subCount.count} subs, ${shiftCount.count} shifts`
        );
    }

    // 2. Recalculate Shift Stats
    const allShifts = await db.select().from(shifts);
    console.log(`Found ${allShifts.length} shifts.`);

    for (const shift of allShifts) {
        const [candCount] = await db
            .select({ count: count() })
            .from(submissions)
            .where(eq(submissions.shiftId, shift.id));

        await db
            .update(shifts)
            .set({
                candidateCount: candCount.count,
            })
            .where(eq(shifts.id, shift.id));

        // Logging only every 10th to avoid spam if many
        if (shift.id % 10 === 0) console.log(`Processed up to Shift ID ${shift.id}`);
    }

    console.log("Metrics recalculation complete.");
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
