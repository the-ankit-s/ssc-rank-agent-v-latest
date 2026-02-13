import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { db } from "@/lib/db/client";
import { exams, shifts, submissions, cutoffs } from "@/lib/db/schema";
import { eq, sql, asc } from "drizzle-orm";

// ─── Constants ──────────────────────────────────────────────────────────────

const ARCHIVE_DIR = path.join(process.cwd(), "data", "archives");
const BATCH_SIZE = 500;
const ARCHIVE_VERSION = 1;

// Ensure archive directory exists
function ensureDir() {
    if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
}

function archivePath(slug: string) {
    return path.join(ARCHIVE_DIR, `${slug}.db`);
}

// ─── SQLite Schema Creation ─────────────────────────────────────────────────

function createTables(sqlite: Database.Database) {
    sqlite.exec(`
        CREATE TABLE IF NOT EXISTS metadata (
            key TEXT PRIMARY KEY,
            value TEXT
        );

        CREATE TABLE IF NOT EXISTS shifts (
            id INTEGER PRIMARY KEY,
            exam_id INTEGER NOT NULL,
            shift_code TEXT NOT NULL,
            date TEXT,
            shift_number INTEGER,
            time_slot TEXT,
            start_time TEXT,
            end_time TEXT,
            candidate_count INTEGER DEFAULT 0,
            avg_raw_score REAL,
            median_raw_score REAL,
            std_dev REAL,
            max_raw_score REAL,
            min_raw_score REAL,
            percentile_cutoffs TEXT,
            section_stats TEXT,
            difficulty_index REAL,
            difficulty_label TEXT,
            normalization_factor REAL,
            stats_updated_at TEXT,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY,
            exam_id INTEGER NOT NULL,
            shift_id INTEGER NOT NULL,
            roll_number TEXT NOT NULL,
            roll_number_hash TEXT,
            name TEXT NOT NULL,
            father_name TEXT,
            dob TEXT,
            exam_centre TEXT,
            exam_centre_code TEXT,
            category TEXT NOT NULL,
            gender TEXT NOT NULL,
            state TEXT,
            horizontal_category TEXT,
            is_pwd INTEGER DEFAULT 0,
            is_ex_serviceman INTEGER DEFAULT 0,
            section_performance TEXT,
            responses TEXT,
            total_attempted INTEGER DEFAULT 0,
            total_correct INTEGER DEFAULT 0,
            total_wrong INTEGER DEFAULT 0,
            accuracy REAL,
            raw_score REAL NOT NULL,
            normalized_score REAL,
            overall_rank INTEGER,
            category_rank INTEGER,
            shift_rank INTEGER,
            state_rank INTEGER,
            overall_percentile REAL,
            category_percentile REAL,
            shift_percentile REAL,
            source TEXT,
            source_url TEXT,
            url_hash TEXT,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS cutoffs (
            id INTEGER PRIMARY KEY,
            exam_id INTEGER NOT NULL,
            category TEXT NOT NULL,
            post_code TEXT,
            post_name TEXT,
            expected_cutoff REAL NOT NULL,
            safe_score REAL,
            minimum_score REAL,
            previous_year_cutoff REAL,
            previous_year_vacancy INTEGER,
            current_year_vacancy INTEGER,
            confidence_level TEXT,
            prediction_basis TEXT,
            is_published INTEGER DEFAULT 0,
            published_at TEXT,
            priority_order INTEGER DEFAULT 0,
            created_at TEXT
        );

        -- Indexes for query performance
        CREATE INDEX IF NOT EXISTS idx_submissions_shift ON submissions(shift_id);
        CREATE INDEX IF NOT EXISTS idx_submissions_category ON submissions(category);
        CREATE INDEX IF NOT EXISTS idx_submissions_rank ON submissions(overall_rank);
        CREATE INDEX IF NOT EXISTS idx_submissions_raw_score ON submissions(raw_score);
        CREATE INDEX IF NOT EXISTS idx_submissions_normalized ON submissions(normalized_score);
        CREATE INDEX IF NOT EXISTS idx_submissions_roll ON submissions(roll_number);
    `);
}

// ─── Archive Exam ───────────────────────────────────────────────────────────

export async function archiveExam(examId: number): Promise<{
    success: boolean;
    filePath?: string;
    fileSize?: number;
    submissionsArchived?: number;
    shiftsArchived?: number;
    cutoffsArchived?: number;
    error?: string;
}> {
    // 1. Get exam info
    const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
    if (!exam) return { success: false, error: "Exam not found" };

    ensureDir();
    const dbPath = archivePath(exam.slug);

    // Clean up any stale/partial archive from a previous failed attempt
    if (fs.existsSync(dbPath)) {
        try {
            fs.unlinkSync(dbPath);
            // Also clean WAL/SHM files if they exist
            const walPath = dbPath + "-wal";
            const shmPath = dbPath + "-shm";
            if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
            if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
        } catch (cleanupErr: any) {
            return { success: false, error: `Failed to clean up old archive: ${cleanupErr.message}` };
        }
    }

    // 2. Create SQLite database
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("synchronous = NORMAL");
    createTables(sqlite);

    try {
        // 3. Write metadata
        const insertMeta = sqlite.prepare("INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)");
        const metaTx = sqlite.transaction(() => {
            insertMeta.run("exam_id", String(exam.id));
            insertMeta.run("exam_name", exam.name);
            insertMeta.run("exam_slug", exam.slug);
            insertMeta.run("exam_year", String(exam.year));
            insertMeta.run("agency", exam.agency);
            insertMeta.run("tier", exam.tier || "");
            insertMeta.run("total_marks", String(exam.totalMarks));
            insertMeta.run("total_questions", String(exam.totalQuestions));
            insertMeta.run("section_config", JSON.stringify(exam.sectionConfig));
            insertMeta.run("normalization_method", exam.normalizationMethod || "z_score");
            insertMeta.run("archive_version", String(ARCHIVE_VERSION));
            insertMeta.run("archived_at", new Date().toISOString());
            insertMeta.run("archived_from", "postgresql");
        });
        metaTx();

        // 4. Archive shifts
        const examShifts = await db.select().from(shifts).where(eq(shifts.examId, examId));
        const insertShift = sqlite.prepare(`
            INSERT OR REPLACE INTO shifts (id, exam_id, shift_code, date, shift_number, time_slot, start_time,
                end_time, candidate_count, avg_raw_score, median_raw_score, std_dev, max_raw_score,
                min_raw_score, percentile_cutoffs, section_stats, difficulty_index, difficulty_label,
                normalization_factor, stats_updated_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const shiftTx = sqlite.transaction(() => {
            for (const s of examShifts) {
                insertShift.run(
                    s.id, s.examId, s.shiftCode, s.date, s.shiftNumber, s.timeSlot,
                    s.startTime, s.endTime, s.candidateCount, s.avgRawScore, s.medianRawScore,
                    s.stdDev, s.maxRawScore, s.minRawScore,
                    s.percentileCutoffs ? JSON.stringify(s.percentileCutoffs) : null,
                    s.sectionStats ? JSON.stringify(s.sectionStats) : null,
                    s.difficultyIndex, s.difficultyLabel, s.normalizationFactor,
                    s.statsUpdatedAt?.toISOString() || null,
                    s.createdAt?.toISOString() || null
                );
            }
        });
        shiftTx();

        // 5. Archive cutoffs
        const examCutoffs = await db.select().from(cutoffs).where(eq(cutoffs.examId, examId));
        const insertCutoff = sqlite.prepare(`
            INSERT OR REPLACE INTO cutoffs (id, exam_id, category, post_code, post_name, expected_cutoff,
                safe_score, minimum_score, previous_year_cutoff, previous_year_vacancy,
                current_year_vacancy, confidence_level, prediction_basis, is_published, published_at,
                priority_order, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const cutoffTx = sqlite.transaction(() => {
            for (const c of examCutoffs) {
                insertCutoff.run(
                    c.id, c.examId, c.category, c.postCode, c.postName, c.expectedCutoff,
                    c.safeScore, c.minimumScore, c.previousYearCutoff, c.previousYearVacancy,
                    c.currentYearVacancy, c.confidenceLevel,
                    c.predictionBasis ? JSON.stringify(c.predictionBasis) : null,
                    c.isPublished ? 1 : 0,
                    c.publishedAt?.toISOString() || null,
                    c.priorityOrder,
                    c.createdAt?.toISOString() || null
                );
            }
        });
        cutoffTx();

        // 6. Archive submissions in batches
        let totalSubmissions = 0;
        let offset = 0;
        const insertSub = sqlite.prepare(`
            INSERT OR REPLACE INTO submissions (id, exam_id, shift_id, roll_number, roll_number_hash, name,
                father_name, dob, exam_centre, exam_centre_code, category, gender, state,
                horizontal_category, is_pwd, is_ex_serviceman, section_performance, responses,
                total_attempted, total_correct, total_wrong, accuracy, raw_score, normalized_score,
                overall_rank, category_rank, shift_rank, state_rank, overall_percentile,
                category_percentile, shift_percentile, source, source_url, url_hash, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        while (true) {
            const batch = await db.select().from(submissions)
                .where(eq(submissions.examId, examId))
                .orderBy(asc(submissions.id))
                .limit(BATCH_SIZE).offset(offset);

            if (batch.length === 0) break;

            const subTx = sqlite.transaction(() => {
                for (const s of batch) {
                    insertSub.run(
                        s.id, s.examId, s.shiftId, s.rollNumber, s.rollNumberHash, s.name,
                        s.fatherName, s.dob, s.examCentre, s.examCentreCode,
                        s.category, s.gender, s.state, s.horizontalCategory,
                        s.isPWD ? 1 : 0, s.isExServiceman ? 1 : 0,
                        s.sectionPerformance ? JSON.stringify(s.sectionPerformance) : null,
                        s.responses ? JSON.stringify(s.responses) : null,
                        s.totalAttempted, s.totalCorrect, s.totalWrong, s.accuracy,
                        s.rawScore, s.normalizedScore,
                        s.overallRank, s.categoryRank, s.shiftRank, s.stateRank,
                        s.overallPercentile, s.categoryPercentile, s.shiftPercentile,
                        s.source, s.sourceUrl, s.urlHash,
                        s.createdAt?.toISOString() || null
                    );
                }
            });
            subTx();

            totalSubmissions += batch.length;
            offset += BATCH_SIZE;
        }

        sqlite.close();

        // 7. VALIDATION — verify SQLite has the correct count before deleting from PG
        const [pgCount] = await db.select({ count: sql<number>`count(*)::int` }).from(submissions).where(eq(submissions.examId, examId));
        const expectedCount = pgCount?.count || 0;

        const verifyDb = new Database(dbPath, { readonly: true });
        const sqliteCount = (verifyDb.prepare("SELECT COUNT(*) as cnt FROM submissions").get() as any)?.cnt || 0;
        verifyDb.close();

        if (sqliteCount < expectedCount) {
            // Data loss detected — do NOT delete from PG
            console.error(`[ARCHIVE] Integrity check FAILED: SQLite has ${sqliteCount} rows but PG has ${expectedCount}. Aborting delete.`);
            // Clean up the bad archive
            if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
            if (fs.existsSync(dbPath + "-wal")) fs.unlinkSync(dbPath + "-wal");
            if (fs.existsSync(dbPath + "-shm")) fs.unlinkSync(dbPath + "-shm");
            return { success: false, error: `Integrity check failed: archived ${sqliteCount} but PG has ${expectedCount} submissions. Archive aborted — no data was deleted.` };
        }

        // 8. Delete submissions from Postgres (the whole cost-saving point)
        await db.delete(submissions).where(eq(submissions.examId, examId));

        // 9. Update exam — mark as archived by setting status to closed + isActive false
        await db.update(exams).set({
            isActive: false,
            status: "closed",
            totalSubmissions: 0,
            updatedAt: new Date(),
        }).where(eq(exams.id, examId));

        const stats = fs.statSync(dbPath);

        return {
            success: true,
            filePath: dbPath,
            fileSize: stats.size,
            submissionsArchived: totalSubmissions,
            shiftsArchived: examShifts.length,
            cutoffsArchived: examCutoffs.length,
        };
    } catch (err: any) {
        sqlite.close();
        // Clean up partial archive on failure (including WAL/SHM)
        try {
            if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
            if (fs.existsSync(dbPath + "-wal")) fs.unlinkSync(dbPath + "-wal");
            if (fs.existsSync(dbPath + "-shm")) fs.unlinkSync(dbPath + "-shm");
        } catch { /* best effort cleanup */ }
        const errorMsg = err.message || "Archive failed";
        console.error(`[ARCHIVE] Failed to archive exam ${examId}:`, errorMsg, err.stack);
        return { success: false, error: errorMsg };
    }
}

// ─── Restore Exam ───────────────────────────────────────────────────────────

export async function restoreExam(examId: number): Promise<{
    success: boolean;
    submissionsRestored?: number;
    error?: string;
}> {
    const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
    if (!exam) return { success: false, error: "Exam not found" };

    const dbPath = archivePath(exam.slug);
    if (!fs.existsSync(dbPath)) return { success: false, error: "No archive file found for this exam" };

    const sqlite = new Database(dbPath, { readonly: true });

    try {
        // Read submissions from SQLite in batches
        const countRow = sqlite.prepare("SELECT COUNT(*) as cnt FROM submissions").get() as any;
        const totalRows = countRow?.cnt || 0;
        let restored = 0;

        const stmt = sqlite.prepare("SELECT * FROM submissions LIMIT ? OFFSET ?");

        while (restored < totalRows) {
            const batch = stmt.all(BATCH_SIZE, restored) as any[];
            if (batch.length === 0) break;

            // Insert into Postgres in batches
            const values = batch.map(s => ({
                examId: s.exam_id,
                shiftId: s.shift_id,
                rollNumber: s.roll_number,
                rollNumberHash: s.roll_number_hash || "",
                name: s.name,
                fatherName: s.father_name,
                dob: s.dob,
                examCentre: s.exam_centre,
                examCentreCode: s.exam_centre_code,
                category: s.category,
                gender: s.gender,
                state: s.state,
                horizontalCategory: s.horizontal_category || "NONE",
                isPWD: s.is_pwd === 1,
                isExServiceman: s.is_ex_serviceman === 1,
                sectionPerformance: s.section_performance ? JSON.parse(s.section_performance) : {},
                responses: s.responses ? JSON.parse(s.responses) : [],
                totalAttempted: s.total_attempted,
                totalCorrect: s.total_correct,
                totalWrong: s.total_wrong,
                accuracy: s.accuracy,
                rawScore: s.raw_score,
                normalizedScore: s.normalized_score,
                overallRank: s.overall_rank,
                categoryRank: s.category_rank,
                shiftRank: s.shift_rank,
                stateRank: s.state_rank,
                overallPercentile: s.overall_percentile,
                categoryPercentile: s.category_percentile,
                shiftPercentile: s.shift_percentile,
                source: s.source || "archive_restore",
                sourceUrl: s.source_url,
                urlHash: s.url_hash,
            }));

            await db.insert(submissions).values(values).onConflictDoNothing();
            restored += batch.length;
        }

        sqlite.close();

        // Update exam stats
        const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(submissions).where(eq(submissions.examId, examId));
        await db.update(exams).set({
            isActive: true,
            status: "active",
            totalSubmissions: Number(countResult.count),
            updatedAt: new Date(),
        }).where(eq(exams.id, examId));

        // Delete archive file
        fs.unlinkSync(dbPath);

        return { success: true, submissionsRestored: restored };
    } catch (err: any) {
        sqlite.close();
        return { success: false, error: err.message || "Restore failed" };
    }
}

// ─── Archive Info ───────────────────────────────────────────────────────────

export function getArchiveInfo(slug: string): {
    exists: boolean;
    filePath?: string;
    fileSize?: number;
    fileSizeMB?: string;
    submissionCount?: number;
    shiftCount?: number;
    cutoffCount?: number;
    archivedAt?: string;
    examName?: string;
} | null {
    ensureDir();
    const dbPath = archivePath(slug);
    if (!fs.existsSync(dbPath)) return { exists: false };

    const sqlite = new Database(dbPath, { readonly: true });
    try {
        const stats = fs.statSync(dbPath);
        const subCount = (sqlite.prepare("SELECT COUNT(*) as cnt FROM submissions").get() as any)?.cnt || 0;
        const shiftCount = (sqlite.prepare("SELECT COUNT(*) as cnt FROM shifts").get() as any)?.cnt || 0;
        const cutoffCount = (sqlite.prepare("SELECT COUNT(*) as cnt FROM cutoffs").get() as any)?.cnt || 0;
        const archivedAt = (sqlite.prepare("SELECT value FROM metadata WHERE key = 'archived_at'").get() as any)?.value;
        const examName = (sqlite.prepare("SELECT value FROM metadata WHERE key = 'exam_name'").get() as any)?.value;

        sqlite.close();
        return {
            exists: true,
            filePath: dbPath,
            fileSize: stats.size,
            fileSizeMB: (stats.size / 1024 / 1024).toFixed(2),
            submissionCount: subCount,
            shiftCount,
            cutoffCount,
            archivedAt,
            examName,
        };
    } catch {
        sqlite.close();
        return { exists: false };
    }
}

// ─── Query Archive (Monetization: read-only queries) ────────────────────────

export function queryArchive(slug: string, options: {
    type: "submissions" | "shifts" | "cutoffs" | "summary";
    page?: number;
    limit?: number;
    category?: string;
    shiftId?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}): { data: any[]; total: number; page: number; limit: number; metadata?: Record<string, string> } | null {
    ensureDir();
    const dbPath = archivePath(slug);
    if (!fs.existsSync(dbPath)) return null;

    const sqlite = new Database(dbPath, { readonly: true });
    const page = options.page || 1;
    const limit = Math.min(options.limit || 50, 200); // Cap at 200 per page
    const offset = (page - 1) * limit;

    try {
        if (options.type === "summary") {
            // Return exam summary — free tier / preview
            const metadata: Record<string, string> = {};
            const rows = sqlite.prepare("SELECT key, value FROM metadata").all() as any[];
            rows.forEach(r => metadata[r.key] = r.value);

            const subCount = (sqlite.prepare("SELECT COUNT(*) as cnt FROM submissions").get() as any)?.cnt;
            const avgScore = (sqlite.prepare("SELECT AVG(raw_score) as avg FROM submissions").get() as any)?.avg;
            const maxScore = (sqlite.prepare("SELECT MAX(raw_score) as max FROM submissions").get() as any)?.max;

            const shiftData = sqlite.prepare("SELECT shift_code, candidate_count, avg_raw_score, difficulty_label FROM shifts ORDER BY date, shift_number").all();

            const categoryDist = sqlite.prepare("SELECT category, COUNT(*) as count, AVG(raw_score) as avg_score FROM submissions GROUP BY category").all();

            sqlite.close();
            return {
                data: [{ submissionCount: subCount, avgScore, maxScore, shifts: shiftData, categoryDistribution: categoryDist }],
                total: 1, page: 1, limit: 1,
                metadata,
            };
        }

        const table = options.type;
        let where = "";
        const params: any[] = [];

        if (options.type === "submissions") {
            if (options.category) { where += " AND category = ?"; params.push(options.category); }
            if (options.shiftId) { where += " AND shift_id = ?"; params.push(options.shiftId); }
        }

        const whereClause = where ? `WHERE 1=1 ${where}` : "";
        const orderCol = options.sortBy || (options.type === "submissions" ? "raw_score" : "id");
        const orderDir = options.sortOrder || "desc";

        const total = (sqlite.prepare(`SELECT COUNT(*) as cnt FROM ${table} ${whereClause}`).get(...params) as any)?.cnt || 0;
        const data = sqlite.prepare(`SELECT * FROM ${table} ${whereClause} ORDER BY ${orderCol} ${orderDir} LIMIT ? OFFSET ?`).all(...params, limit, offset);

        sqlite.close();
        return { data, total, page, limit };
    } catch {
        sqlite.close();
        return null;
    }
}

// ─── List All Archives ──────────────────────────────────────────────────────

export function listArchives(): Array<{
    slug: string;
    fileName: string;
    fileSize: number;
    fileSizeMB: string;
}> {
    ensureDir();
    const files = fs.readdirSync(ARCHIVE_DIR).filter(f => f.endsWith(".db"));
    return files.map(f => {
        const stats = fs.statSync(path.join(ARCHIVE_DIR, f));
        return {
            slug: f.replace(".db", ""),
            fileName: f,
            fileSize: stats.size,
            fileSizeMB: (stats.size / 1024 / 1024).toFixed(2),
        };
    });
}
