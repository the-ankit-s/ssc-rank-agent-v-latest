import "dotenv/config";
import { db } from "./client";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

// Indian names data for realistic seeding
const firstNames = [
    "Rahul", "Priya", "Amit", "Neha", "Vikram", "Anjali", "Suresh", "Deepika",
    "Rajesh", "Pooja", "Arun", "Kavitha", "Manoj", "Sunita", "Ravi", "Meera",
    "Sanjay", "Lakshmi", "Vinod", "Anita", "Ajay", "Rekha", "Sunil", "Geeta",
    "Prakash", "Shreya", "Dinesh", "Nisha", "Mohan", "Swati", "Ashok", "Pallavi",
    "Ramesh", "Divya", "Ganesh", "Preeti", "Kishore", "Rani", "Gopal", "Sneha",
    "Santosh", "Archana", "Naresh", "Shalini", "Vijay", "Bhavana", "Harish", "Jyoti",
    "Aditya", "Ritika", "Karan", "Simran", "Arjun", "Tanvi", "Rohan", "Sakshi",
    "Vishal", "Nupur", "Nikhil", "Kritika", "Abhishek", "Megha", "Akash", "Shweta"
];

const lastNames = [
    "Sharma", "Verma", "Singh", "Kumar", "Gupta", "Patel", "Agarwal", "Jain",
    "Mehta", "Shah", "Reddy", "Nair", "Iyer", "Mukherjee", "Das", "Ghosh",
    "Chatterjee", "Banerjee", "Roy", "Sen", "Bose", "Dutta", "Saini", "Yadav",
    "Chauhan", "Rajput", "Thakur", "Mishra", "Pandey", "Tiwari", "Dubey", "Trivedi",
    "Shukla", "Dwivedi", "Srivastava", "Sinha", "Chaudhary", "Malik", "Gill", "Dhillon"
];

const categories: ("UR" | "OBC" | "EWS" | "SC" | "ST")[] = ["UR", "OBC", "EWS", "SC", "ST"];
const states = [
    "Delhi", "Maharashtra", "Karnataka", "Tamil Nadu", "West Bengal",
    "Uttar Pradesh", "Rajasthan", "Gujarat", "Madhya Pradesh", "Punjab",
    "Bihar", "Jharkhand", "Odisha", "Andhra Pradesh", "Telangana"
];

const examCentres = [
    "Delhi - Centre 001", "Delhi - Centre 002", "Delhi - Centre 003",
    "Mumbai - Centre 001", "Mumbai - Centre 002", "Mumbai - Centre 003",
    "Chennai - Centre 001", "Bangalore - Centre 001", "Hyderabad - Centre 001",
    "Kolkata - Centre 001", "Lucknow - Centre 001", "Jaipur - Centre 001"
];

function getRandomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDOB(): string {
    const year = getRandomInt(1990, 2002);
    const month = String(getRandomInt(1, 12)).padStart(2, "0");
    const day = String(getRandomInt(1, 28)).padStart(2, "0");
    return `${day}/${month}/${year}`;
}

function generateRollNumber(prefix: string, index: number): string {
    return `${prefix}${String(index).padStart(7, "0")}`;
}

function hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

// Generate realistic exam responses
interface ResponseData {
    correct: number;
    wrong: number;
    unattempted: number;
    marks: number;
    sectionPerf: Record<string, { marks: number; correct: number; wrong: number; unattempted: number }>;
    responses: Array<{ qNo: number; section: string; selected: string | null; correct: string; isCorrect: boolean }>;
}

function generateResponses(difficultyFactor: number): ResponseData {
    const sections = [
        { code: "GI", questions: 25 },
        { code: "QA", questions: 25 },
        { code: "EN", questions: 25 },
        { code: "GA", questions: 25 },
    ];

    const responses: ResponseData["responses"] = [];
    const sectionPerf: ResponseData["sectionPerf"] = {};
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalUnattempted = 0;
    let qNumber = 1;

    // Base accuracy affected by difficulty
    const baseAccuracy = 0.65 + (Math.random() * 0.25) - (difficultyFactor * 0.15);
    const attemptRate = 0.88 + (Math.random() * 0.1);

    for (const section of sections) {
        let secCorrect = 0;
        let secWrong = 0;
        let secUnattempted = 0;

        for (let i = 0; i < section.questions; i++) {
            const correctAnswer = String.fromCharCode(65 + Math.floor(Math.random() * 4));
            const attempted = Math.random() < attemptRate;

            let selected: string | null = null;
            let isCorrect = false;

            if (attempted) {
                isCorrect = Math.random() < baseAccuracy;
                selected = isCorrect ? correctAnswer : String.fromCharCode(65 + Math.floor(Math.random() * 4));
                if (selected === correctAnswer) {
                    secCorrect++;
                    totalCorrect++;
                } else {
                    secWrong++;
                    totalWrong++;
                }
            } else {
                secUnattempted++;
                totalUnattempted++;
            }

            responses.push({
                qNo: qNumber++,
                section: section.code,
                selected,
                correct: correctAnswer,
                isCorrect: selected === correctAnswer,
            });
        }

        sectionPerf[section.code] = {
            marks: (secCorrect * 2) - (secWrong * 0.5),
            correct: secCorrect,
            wrong: secWrong,
            unattempted: secUnattempted,
        };
    }

    const marks = (totalCorrect * 2) - (totalWrong * 0.5);
    return { correct: totalCorrect, wrong: totalWrong, unattempted: totalUnattempted, marks, sectionPerf, responses };
}

export async function seedDatabase() {
    console.log("🌱 Starting database seed...\n");

    try {
        // 1. Create Admin User
        console.log("Creating admin user...");
        const [adminUser] = await db.insert(schema.adminUsers).values({
            email: "admin@rankifyai.com",
            passwordHash: "$2b$10$dummyhashedpassword123456",
            name: "System Admin",
            role: "super_admin",
            isActive: true,
        }).onConflictDoNothing().returning();

        // 2. Create Exams with Section Config
        console.log("Creating exams...");
        const sectionConfig = {
            GI: { code: "GI", label: "General Intelligence", maxMarks: 50, questions: 25, positive: 2, negative: 0.5, order: 1, isQualifying: false },
            QA: { code: "QA", label: "Quantitative Aptitude", maxMarks: 50, questions: 25, positive: 2, negative: 0.5, order: 2, isQualifying: false },
            EN: { code: "EN", label: "English Comprehension", maxMarks: 50, questions: 25, positive: 2, negative: 0.5, order: 3, isQualifying: false },
            GA: { code: "GA", label: "General Awareness", maxMarks: 50, questions: 25, positive: 2, negative: 0.5, order: 4, isQualifying: false },
        };

        const [cglExam] = await db.insert(schema.exams).values({
            name: "SSC CGL 2024",
            slug: "ssc-cgl-2024",
            agency: "SSC",
            year: 2024,
            tier: "Tier-I",
            totalMarks: 200,
            totalQuestions: 100,
            duration: 60,
            defaultPositive: 2,
            defaultNegative: 0.5,
            sectionConfig,
            hasSectionalTiming: false,
            hasNormalization: true,
            allowMultipleSubmissions: false,
            isActive: true,
            status: "active",
            analysisPhase: "preliminary",
            isFeatured: true,
            priorityOrder: 1,
            metaDescription: "SSC CGL 2024 Tier-I Result Analysis and Rank Predictor",
        }).onConflictDoNothing().returning();

        const [cpoExam] = await db.insert(schema.exams).values({
            name: "SSC CPO 2024",
            slug: "ssc-cpo-2024",
            agency: "SSC",
            year: 2024,
            tier: "Paper-I",
            totalMarks: 200,
            totalQuestions: 100,
            duration: 60,
            defaultPositive: 2,
            defaultNegative: 0.5,
            sectionConfig,
            hasNormalization: true,
            isActive: true,
            status: "active",
            isFeatured: true,
            priorityOrder: 2,
        }).onConflictDoNothing().returning();

        const [chslExam] = await db.insert(schema.exams).values({
            name: "SSC CHSL 2023",
            slug: "ssc-chsl-2023",
            agency: "SSC",
            year: 2023,
            tier: "Final",
            totalMarks: 200,
            totalQuestions: 100,
            duration: 60,
            defaultPositive: 2,
            defaultNegative: 0.5,
            sectionConfig,
            hasNormalization: true,
            isActive: false,
            status: "closed",
            isFeatured: false,
            priorityOrder: 10,
        }).onConflictDoNothing().returning();

        if (!cglExam) {
            console.log("Exams already exist, fetching...");
            return;
        }

        // 3. Create Shifts for SSC CGL 2024 (15 days * 3 shifts = 45 shifts)
        console.log("Creating shifts...");
        const shiftIds: number[] = [];
        const shiftDifficulties: number[] = [];

        for (let day = 1; day <= 15; day++) {
            for (let shift = 1; shift <= 3; shift++) {
                const date = `2024-09-${String(day).padStart(2, "0")}`;
                const shiftCode = `CGL24-${date}-S${shift}`;
                const difficultyIndex = 0.3 + Math.random() * 0.4; // 0.3 to 0.7
                const difficultyLabel = difficultyIndex < 0.4 ? "Easy" : difficultyIndex < 0.55 ? "Moderate" : "Difficult";
                const normFactor = 1 - (difficultyIndex - 0.5) * 0.3; // Higher factor for harder shifts

                const [s] = await db.insert(schema.shifts).values({
                    examId: cglExam.id,
                    shiftCode,
                    date,
                    shiftNumber: shift,
                    timeSlot: shift === 1 ? "9:00 AM - 10:00 AM" : shift === 2 ? "12:00 PM - 1:00 PM" : "3:00 PM - 4:00 PM",
                    difficultyIndex,
                    difficultyLabel,
                    normalizationFactor: normFactor,
                }).returning();

                shiftIds.push(s.id);
                shiftDifficulties.push(difficultyIndex);
            }
        }

        // 4. Create Student Submissions (1000 students)
        console.log("Creating 1000 student submissions...");
        const submissionsToCreate = 1000;

        for (let i = 1; i <= submissionsToCreate; i++) {
            const firstName = getRandomElement(firstNames);
            const lastName = getRandomElement(lastNames);
            const shiftIndex = Math.floor(Math.random() * shiftIds.length);
            const shiftId = shiftIds[shiftIndex];
            const difficulty = shiftDifficulties[shiftIndex];
            const category = getRandomElement(categories) as "UR" | "OBC" | "EWS" | "SC" | "ST";
            const gender = (Math.random() > 0.6 ? "M" : "F") as "M" | "F" | "O";
            const state = getRandomElement(states);

            const { correct, wrong, unattempted, marks, sectionPerf, responses } = generateResponses(difficulty);
            const normFactor = 1 - (difficulty - 0.5) * 0.3;
            const normalizedScore = marks * normFactor;
            const accuracy = correct / (correct + wrong) * 100;

            const rollNumber = generateRollNumber("CGL24", i);

            await db.insert(schema.submissions).values({
                examId: cglExam.id,
                shiftId,
                rollNumber,
                rollNumberHash: hashString(rollNumber),
                name: `${firstName} ${lastName}`,
                fatherName: `${getRandomElement(firstNames)} ${lastName}`,
                dob: generateDOB(),
                examCentre: getRandomElement(examCentres),
                category,
                gender,
                state,
                sectionPerformance: sectionPerf,
                responses,
                totalAttempted: correct + wrong,
                totalCorrect: correct,
                totalWrong: wrong,
                accuracy,
                rawScore: marks,
                normalizedScore,
                source: "seed_data",
            });

            if (i % 100 === 0) {
                console.log(`  Created ${i} submissions...`);
            }
        }

        // 5. Calculate and update ranks
        console.log("Calculating ranks...");
        const allSubmissions = await db.select().from(schema.submissions)
            .where(eq(schema.submissions.examId, cglExam.id))
            .orderBy(schema.submissions.normalizedScore);

        // Overall ranks (by normalized score descending)
        const sortedByScore = [...allSubmissions].sort((a, b) => (b.normalizedScore || 0) - (a.normalizedScore || 0));

        for (let rank = 0; rank < sortedByScore.length; rank++) {
            const sub = sortedByScore[rank];
            const percentile = ((sortedByScore.length - rank) / sortedByScore.length) * 100;

            await db.update(schema.submissions)
                .set({
                    overallRank: rank + 1,
                    overallPercentile: percentile,
                })
                .where(eq(schema.submissions.id, sub.id));
        }

        // Category ranks
        for (const cat of categories) {
            const catSubs = sortedByScore.filter(s => s.category === cat);
            for (let rank = 0; rank < catSubs.length; rank++) {
                const sub = catSubs[rank];
                const percentile = ((catSubs.length - rank) / catSubs.length) * 100;

                await db.update(schema.submissions)
                    .set({
                        categoryRank: rank + 1,
                        categoryPercentile: percentile,
                    })
                    .where(eq(schema.submissions.id, sub.id));
            }
        }

        // 6. Update shift statistics
        console.log("Updating shift statistics...");
        for (const shiftId of shiftIds) {
            const shiftSubs = allSubmissions.filter(s => s.shiftId === shiftId);
            if (shiftSubs.length > 0) {
                const scores = shiftSubs.map(s => s.rawScore);
                const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
                const maxScore = Math.max(...scores);
                const minScore = Math.min(...scores);

                await db.update(schema.shifts)
                    .set({
                        candidateCount: shiftSubs.length,
                        avgRawScore: avgScore,
                        maxRawScore: maxScore,
                        minRawScore: minScore,
                    })
                    .where(eq(schema.shifts.id, shiftId));
            }
        }

        // 7. Create Cutoffs
        console.log("Creating cutoffs...");
        const cutoffData = [
            { category: "UR", expected: 165, safe: 175, prevYear: 162 },
            { category: "OBC", expected: 155, safe: 165, prevYear: 152 },
            { category: "EWS", expected: 150, safe: 160, prevYear: 148 },
            { category: "SC", expected: 140, safe: 150, prevYear: 138 },
            { category: "ST", expected: 130, safe: 140, prevYear: 128 },
        ];

        for (const c of cutoffData) {
            await db.insert(schema.cutoffs).values({
                examId: cglExam.id,
                category: c.category,
                expectedCutoff: c.expected,
                safeScore: c.safe,
                previousYearCutoff: c.prevYear,
                confidenceLevel: "medium",
                isPublished: true,
            }).onConflictDoNothing();
        }

        // 8. Update exam statistics
        console.log("Updating exam statistics...");
        await db.update(schema.exams)
            .set({
                totalShifts: shiftIds.length,
                totalSubmissions: submissionsToCreate,
                lastSubmissionAt: new Date(),
            })
            .where(eq(schema.exams.id, cglExam.id));

        console.log("\n✅ Database seeding complete!");
        console.log(`   - Admin user created`);
        console.log(`   - 3 Exams created`);
        console.log(`   - ${shiftIds.length} Shifts created`);
        console.log(`   - ${submissionsToCreate} Student submissions created`);
        console.log(`   - ${cutoffData.length} Cutoffs set`);
        console.log(`   - Ranks calculated`);

    } catch (error) {
        console.error("❌ Seeding failed:", error);
        throw error;
    }
}

// Run if executed directly
if (require.main === module) {
    seedDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
