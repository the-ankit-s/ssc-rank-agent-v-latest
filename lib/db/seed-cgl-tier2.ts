import "dotenv/config";
import { db } from "./client";
import * as schema from "./schema";
import { eq, sql } from "drizzle-orm";

// ─── SSC CGL Tier 2 2025 realistic seed data (1,00,000 students) ─────────────
// The script inserts in batches of 500 for performance.
// normalizedScore is intentionally left NULL so you can test the pipeline.

const TOTAL_STUDENTS = 100_000;
const BATCH_SIZE = 500;

// ─── Name pools ──────────────────────────────────────────────────────────────

const firstNames = [
    "Rahul", "Priya", "Amit", "Sneha", "Vikram", "Pooja", "Ankit", "Neha",
    "Suresh", "Kavita", "Rajesh", "Sunita", "Manoj", "Divya", "Akash", "Ritu",
    "Vivek", "Anjali", "Deepak", "Swati", "Arun", "Meena", "Naveen", "Sakshi",
    "Rohit", "Preeti", "Sanjay", "Vandana", "Gaurav", "Komal", "Prakash",
    "Shilpa", "Ramesh", "Nisha", "Pankaj", "Geeta", "Mukesh", "Archana",
    "Harish", "Rekha", "Sunil", "Madhu", "Lokesh", "Jyoti", "Kiran", "Pallavi",
    "Ashok", "Mamta", "Yogesh", "Sapna", "Dinesh", "Aarti", "Umesh", "Rinku",
    "Tarun", "Shikha", "Varun", "Payal", "Hemant", "Bhavna", "Ajay", "Kajal",
    "Dheeraj", "Sonam", "Kunal", "Tanvi", "Mohit", "Isha", "Vinay", "Suman",
    "Raghav", "Chanchal", "Manish", "Radha", "Pawan", "Nidhi", "Nikhil", "Nupur",
    "Tushar", "Smita", "Sameer", "Alka", "Lalit", "Garima", "Vishal", "Hemlata",
    "Sandeep", "Kamini", "Ravi", "Poonam", "Abhishek", "Monika", "Pradeep",
    "Tanu", "Aniket", "Ruchi", "Harsh", "Shruti",
];

const lastNames = [
    "Sharma", "Verma", "Singh", "Kumar", "Yadav", "Gupta", "Rajput", "Mishra",
    "Patel", "Joshi", "Chauhan", "Agarwal", "Pandey", "Tiwari", "Dubey",
    "Shukla", "Dwivedi", "Srivastava", "Sinha", "Chaudhary", "Malik", "Gill",
    "Dhillon", "Reddy", "Nair", "Menon", "Pillai", "Iyer", "Das", "Ghosh",
    "Bose", "Roy", "Sen", "Mukherjee", "Chatterjee", "Dey", "Mandal", "Jha",
    "Thakur", "Rawat", "Saini", "Kashyap", "Tyagi", "Saxena", "Mathur",
    "Mehra", "Kapoor", "Malhotra", "Khanna", "Sethi", "Bhatia",
];

const categories: ("UR" | "OBC" | "EWS" | "SC" | "ST")[] = ["UR", "OBC", "EWS", "SC", "ST"];
// Realistic category distribution (approximate SSC proportions)
const categoryWeights = [30, 30, 10, 18, 12]; // UR 30%, OBC 30%, EWS 10%, SC 18%, ST 12%
const categoryPool: typeof categories[number][] = [];
for (let i = 0; i < categories.length; i++) {
    for (let j = 0; j < categoryWeights[i]; j++) categoryPool.push(categories[i]);
}

const states = [
    "Uttar Pradesh", "Madhya Pradesh", "Rajasthan", "Bihar", "Delhi",
    "Maharashtra", "Gujarat", "West Bengal", "Tamil Nadu", "Karnataka",
    "Punjab", "Haryana", "Jharkhand", "Odisha", "Andhra Pradesh",
    "Telangana", "Chhattisgarh", "Uttarakhand", "Assam", "Kerala",
];

const examCentres = [
    "Delhi - TCS ION Centre 001", "Delhi - TCS ION Centre 002", "Delhi - TCS ION Centre 003",
    "Delhi - TCS ION Centre 004", "Delhi - TCS ION Centre 005",
    "Lucknow - Centre 001", "Lucknow - Centre 002", "Lucknow - Centre 003",
    "Prayagraj - Centre 001", "Prayagraj - Centre 002",
    "Patna - Centre 001", "Patna - Centre 002",
    "Jaipur - Centre 001", "Jaipur - Centre 002",
    "Bhopal - Centre 001", "Bhopal - Centre 002",
    "Mumbai - Centre 001", "Mumbai - Centre 002", "Mumbai - Centre 003",
    "Kolkata - Centre 001", "Kolkata - Centre 002",
    "Chennai - Centre 001", "Bangalore - Centre 001",
    "Hyderabad - Centre 001", "Chandigarh - Centre 001",
    "Ahmedabad - Centre 001", "Ranchi - Centre 001",
    "Dehradun - Centre 001", "Guwahati - Centre 001",
    "Thiruvananthapuram - Centre 001",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

function generateDOB(): string {
    // Ages 21–32 → born 1993–2004
    const y = randInt(1993, 2004);
    const m = randInt(1, 12);
    const d = randInt(1, 28);
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Simple hash
function hashStr(s: string): string {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(36).padStart(8, "0");
}

// ─── SSC CGL Tier 2 paper structure (2025 pattern) ───────────────────────────
// Session I:  Module I — Mathematical Abilities (30Q × 3marks = 90), Module II — Reasoning & GI (30Q × 3marks = 90)
// Session II: Module I — English Language & Comprehension (45Q × 3marks = 135), Module II — General Awareness (25Q × 3marks = 75)
// Total = 150 Questions, 450 Marks, Negative = 1 mark, Duration = 2 hours per session

const TOTAL_QUESTIONS = 150;
const TOTAL_MARKS = 450;
const POSITIVE = 3;
const NEGATIVE = 1;

const sectionConfig: Record<string, any> = {
    MA: { code: "MA", label: "Mathematical Abilities", maxMarks: 90, questions: 30, positive: POSITIVE, negative: NEGATIVE, order: 1, isQualifying: false },
    GI: { code: "GI", label: "Reasoning & General Intelligence", maxMarks: 90, questions: 30, positive: POSITIVE, negative: NEGATIVE, order: 2, isQualifying: false },
    EN: { code: "EN", label: "English Language & Comprehension", maxMarks: 135, questions: 45, positive: POSITIVE, negative: NEGATIVE, order: 3, isQualifying: false },
    GA: { code: "GA", label: "General Awareness", maxMarks: 75, questions: 25, positive: POSITIVE, negative: NEGATIVE, order: 4, isQualifying: false },
};

// Generate section performance for a student given a difficulty factor
function generatePerformance(difficulty: number) {
    // difficulty 0.3 = easy shift, 0.7 = hard shift
    // Student ability is random with a bell-curve-like distribution
    const ability = Math.random() * 0.4 + Math.random() * 0.4 + Math.random() * 0.2; // 0–1, centered ~0.5

    const sections: Record<string, { marks: number; correct: number; wrong: number; unattempted: number }> = {};
    let totalCorrect = 0, totalWrong = 0, totalUnattempted = 0, totalMarks = 0;

    for (const [code, cfg] of Object.entries(sectionConfig)) {
        const q = (cfg as any).questions as number;
        // Attempt rate depends on ability and difficulty
        const attemptRate = Math.min(1, ability * (1.2 - difficulty * 0.4) + 0.15);
        const attempted = Math.round(q * attemptRate);
        // Accuracy depends on ability and difficulty
        const accuracyBase = ability * (1.1 - difficulty * 0.3);
        const accuracy = Math.min(0.95, Math.max(0.15, accuracyBase + (Math.random() - 0.5) * 0.15));
        const correct = Math.round(attempted * accuracy);
        const wrong = attempted - correct;
        const unattempted = q - attempted;
        const marks = correct * POSITIVE - wrong * NEGATIVE;

        sections[code] = { marks, correct, wrong, unattempted };
        totalCorrect += correct;
        totalWrong += wrong;
        totalUnattempted += unattempted;
        totalMarks += marks;
    }

    return { sections, totalCorrect, totalWrong, totalUnattempted, totalMarks, ability };
}

// ─── Main seed function ──────────────────────────────────────────────────────

export async function seedCGLTier2() {
    console.log("🌱 SSC CGL Tier 2 — Seeding 1,00,000 students...\n");

    try {
        // 1. Create exam
        console.log("📝 Creating SSC CGL 2025 Tier 2 exam...");
        const [exam] = await db.insert(schema.exams).values({
            name: "SSC CGL 2025",
            slug: "ssc-cgl-2025-tier2",
            agency: "SSC",
            year: 2025,
            tier: "Tier-II",
            totalMarks: TOTAL_MARKS,
            totalQuestions: TOTAL_QUESTIONS,
            duration: 240, // 4 hours total (2 sessions × 2 hours)
            defaultPositive: POSITIVE,
            defaultNegative: NEGATIVE,
            sectionConfig: sectionConfig as any,
            hasSectionalTiming: true,
            hasNormalization: true,
            allowMultipleSubmissions: false,
            normalizationMethod: "z_score",
            normalizationConfig: {
                targetMean: 200,
                targetStdDev: 50,
                maxNormalizedScore: 450,
                minNormalizedScore: 0,
            },
            isActive: true,
            status: "active",
            analysisPhase: "collecting",
            isFeatured: true,
            priorityOrder: 1,
            metaDescription: "SSC CGL 2025 Tier-II Result Analysis — 1 lakh students, AI rank predictor and cutoff estimator",
            examStartDate: new Date("2025-06-15"),
            examEndDate: new Date("2025-06-28"),
        }).onConflictDoNothing().returning();

        if (!exam) {
            console.log("⚠ Exam already exists. Fetching existing exam...");
            const [existing] = await db.select().from(schema.exams).where(eq(schema.exams.slug, "ssc-cgl-2025-tier2"));
            if (!existing) { console.error("❌ Could not find or create exam."); return; }
            console.log(`   Using existing exam ID ${existing.id}`);
            // Clear old data for fresh seeding
            console.log("   Cleaning old submissions and shifts...");
            await db.delete(schema.submissions).where(eq(schema.submissions.examId, existing.id));
            await db.delete(schema.shifts).where(eq(schema.shifts.examId, existing.id));
            await db.delete(schema.cutoffs).where(eq(schema.cutoffs.examId, existing.id));
            await seedWithExam(existing.id);
            return;
        }

        console.log(`   Exam created with ID ${exam.id}`);
        await seedWithExam(exam.id);

    } catch (err) {
        console.error("❌ Seeding failed:", err);
        throw err;
    }
}

async function seedWithExam(examId: number) {
    // 2. Create shifts — 10 days × 3 shifts = 30 shifts
    console.log("\n📋 Creating 30 shifts (10 days × 3 shifts)...");
    const shiftData: { id: number; difficulty: number }[] = [];

    for (let day = 1; day <= 10; day++) {
        for (let shift = 1; shift <= 3; shift++) {
            const date = `2025-06-${String(14 + day).padStart(2, "0")}`;
            const shiftCode = `CGL25T2-${date}-S${shift}`;
            // Difficulty varies by shift — realistic spread
            const baseDifficulty = 0.35 + Math.random() * 0.35; // 0.35–0.70
            const difficultyLabel = baseDifficulty < 0.42 ? "Easy" : baseDifficulty < 0.55 ? "Moderate" : "Difficult";
            const normFactor = 1 - (baseDifficulty - 0.5) * 0.3;

            const [s] = await db.insert(schema.shifts).values({
                examId,
                shiftCode,
                date,
                shiftNumber: shift,
                timeSlot: shift === 1 ? "9:00 AM - 1:00 PM" : shift === 2 ? "2:30 PM - 6:30 PM" : "7:00 PM - 11:00 PM",
                startTime: shift === 1 ? "09:00" : shift === 2 ? "14:30" : "19:00",
                endTime: shift === 1 ? "13:00" : shift === 2 ? "18:30" : "23:00",
                difficultyIndex: baseDifficulty,
                difficultyLabel,
                normalizationFactor: normFactor,
            }).returning();

            shiftData.push({ id: s.id, difficulty: baseDifficulty });
        }
    }
    console.log(`   ✅ ${shiftData.length} shifts created`);

    // 3. Generate 1,00,000 submissions in batches
    console.log(`\n👥 Generating ${TOTAL_STUDENTS.toLocaleString()} student submissions...`);
    console.log(`   Batch size: ${BATCH_SIZE} | Total batches: ${Math.ceil(TOTAL_STUDENTS / BATCH_SIZE)}`);

    let inserted = 0;
    const startTime = Date.now();
    const usedRolls = new Set<string>(); // avoid duplicates

    for (let batch = 0; batch < Math.ceil(TOTAL_STUDENTS / BATCH_SIZE); batch++) {
        const rows: any[] = [];
        const batchEnd = Math.min((batch + 1) * BATCH_SIZE, TOTAL_STUDENTS);

        for (let i = batch * BATCH_SIZE; i < batchEnd; i++) {
            // Pick a random shift
            const shiftInfo = shiftData[Math.floor(Math.random() * shiftData.length)];

            // Generate unique roll number
            let rollNumber: string;
            do {
                rollNumber = `2725${String(randInt(10000, 99999))}${String(i + 1).padStart(5, "0")}`;
            } while (usedRolls.has(rollNumber));
            usedRolls.add(rollNumber);

            const firstName = pick(firstNames);
            const lastName = pick(lastNames);
            const category = pick(categoryPool);
            const gender = (Math.random() > 0.55 ? "M" : "F") as "M" | "F" | "O";

            const perf = generatePerformance(shiftInfo.difficulty);

            rows.push({
                examId,
                shiftId: shiftInfo.id,
                rollNumber,
                rollNumberHash: hashStr(rollNumber),
                name: `${firstName} ${lastName}`,
                fatherName: `${pick(firstNames)} ${lastName}`,
                dob: generateDOB(),
                examCentre: pick(examCentres),
                examCentreCode: `C${randInt(1000, 9999)}`,
                category,
                gender,
                state: pick(states),
                horizontalCategory: Math.random() < 0.03 ? "PH-VH" : Math.random() < 0.02 ? "PH-OH" : "NONE",
                isPWD: Math.random() < 0.04,
                isExServiceman: Math.random() < 0.01,
                sectionPerformance: perf.sections,
                totalAttempted: perf.totalCorrect + perf.totalWrong,
                totalCorrect: perf.totalCorrect,
                totalWrong: perf.totalWrong,
                accuracy: perf.totalCorrect / Math.max(1, perf.totalCorrect + perf.totalWrong) * 100,
                rawScore: perf.totalMarks,
                normalizedScore: null, // ← LEFT NULL for pipeline testing!
                source: "seed_cgl_tier2",
            });
        }

        // Batch insert
        await db.insert(schema.submissions).values(rows);
        inserted += rows.length;

        if (inserted % 5000 === 0 || inserted === TOTAL_STUDENTS) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const rate = Math.round(inserted / (Number(elapsed) || 1));
            console.log(`   📊 ${inserted.toLocaleString()} / ${TOTAL_STUDENTS.toLocaleString()} inserted (${elapsed}s, ~${rate}/s)`);
        }
    }

    // 4. Update shift statistics
    console.log("\n📈 Updating shift statistics...");
    for (const s of shiftData) {
        await db.execute(sql`
            UPDATE shifts SET
                candidate_count = sub.cnt,
                avg_raw_score = sub.avg_score,
                max_raw_score = sub.max_score,
                min_raw_score = sub.min_score,
                std_dev = sub.std_score,
                median_raw_score = sub.median_score,
                stats_updated_at = now()
            FROM (
                SELECT
                    COUNT(*) as cnt,
                    AVG(raw_score) as avg_score,
                    MAX(raw_score) as max_score,
                    MIN(raw_score) as min_score,
                    STDDEV(raw_score) as std_score,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY raw_score) as median_score
                FROM submissions WHERE shift_id = ${s.id}
            ) sub
            WHERE shifts.id = ${s.id}
        `);
    }

    // 5. Update exam stats
    console.log("📊 Updating exam statistics...");
    await db.update(schema.exams).set({
        totalShifts: shiftData.length,
        totalSubmissions: TOTAL_STUDENTS,
        lastSubmissionAt: new Date(),
    }).where(eq(schema.exams.id, examId));

    const totalTime = ((Date.now() - Date.now()) / 1000).toFixed(1);
    console.log(`\n✅ SSC CGL 2025 Tier 2 — Seeding complete!`);
    console.log(`   📋 Exam ID: ${examId}`);
    console.log(`   📋 Shifts: ${shiftData.length}`);
    console.log(`   👥 Students: ${TOTAL_STUDENTS.toLocaleString()}`);
    console.log(`   ⚠  Normalized Scores: NULL (run pipeline to populate)`);
    console.log(`   ⚠  Ranks: NULL (run pipeline to calculate)`);
    console.log(`   ⚠  Cutoffs: NONE (run pipeline to predict)\n`);
    console.log(`   → Go to /admin/jobs and use the Processing Pipeline to:`);
    console.log(`     Step 1: Normalize Scores`);
    console.log(`     Step 2: Calculate Ranks`);
    console.log(`     Step 3: Predict Cutoffs`);
}

// Run if executed directly
if (require.main === module) {
    seedCGLTier2()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
