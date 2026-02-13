import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handlePostSubmission, checkSignificance, normalizeNewSubmission } from '@/lib/services/incremental-normalization';
import * as IncrementalService from '@/lib/services/incremental-normalization';

// Mock DB
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockOrderBy = vi.fn();
const mockExecute = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockOnConflictDoUpdate = vi.fn();

// Setup chaining
const mockQueryBuilder = {
    select: mockSelect,
    from: mockFrom,
    where: mockWhere,
    limit: mockLimit,
    orderBy: mockOrderBy,
    execute: mockExecute,
    update: mockUpdate,
    set: mockSet,
    insert: mockInsert,
    values: mockValues,
    onConflictDoUpdate: mockOnConflictDoUpdate,
    selectDistinct: vi.fn(() => ({ from: mockFrom })),
};

mockSelect.mockReturnValue(mockQueryBuilder);
mockFrom.mockReturnValue(mockQueryBuilder);
mockWhere.mockReturnValue(mockQueryBuilder);
mockLimit.mockReturnValue(mockQueryBuilder);
mockOrderBy.mockReturnValue(mockQueryBuilder);
mockUpdate.mockReturnValue(mockQueryBuilder);
mockSet.mockReturnValue(mockQueryBuilder);
mockInsert.mockReturnValue(mockQueryBuilder);
mockValues.mockReturnValue(mockQueryBuilder);
mockOnConflictDoUpdate.mockReturnValue(mockQueryBuilder);

vi.mock('@/lib/db', () => ({
    db: {
        select: (...args: any[]) => mockSelect(...args),
        selectDistinct: (...args: any[]) => mockQueryBuilder.selectDistinct(...args),
        execute: (...args: any[]) => mockExecute(...args),
        update: (...args: any[]) => mockUpdate(...args),
        insert: (...args: any[]) => mockInsert(...args),
    }
}));

vi.mock('@/lib/db/schema', () => ({
    exams: { id: 'exams.id', totalSubmissions: 'exams.totalSubmissions', subsAtLastNormalization: 'exams.subsAtLastNormalization', reNormThreshold: 'exams.reNormThreshold', lastNormalizedAt: 'exams.lastNormalizedAt', normalizationMethod: 'exams.normalizationMethod', normalizationConfig: 'exams.normalizationConfig', hasNormalization: 'exams.hasNormalization', totalMarks: 'exams.totalMarks' },
    submissions: { id: 'submissions.id', examId: 'submissions.examId', shiftId: 'submissions.shiftId', rawScore: 'submissions.rawScore', normalizedScore: 'submissions.normalizedScore', category: 'submissions.category', overallRank: 'submissions.overallRank' },
    shifts: { id: 'shifts.id', candidateCount: 'shifts.candidateCount', avgRawScore: 'shifts.avgRawScore', stdDev: 'shifts.stdDev' },
    cutoffs: { examId: 'cutoffs.examId', category: 'cutoffs.category', postCode: 'cutoffs.postCode' },
}));

vi.mock('@/lib/normalization/formulas', () => ({
    getNormalizedScore: vi.fn().mockReturnValue(150),
}));

describe('Incremental Normalization Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Re-establish default chaining
        mockSelect.mockReturnValue(mockQueryBuilder);
        mockFrom.mockReturnValue(mockQueryBuilder);
        mockWhere.mockReturnValue(mockQueryBuilder);
    });

    describe('checkSignificance', () => {
        it('should return isSignificant=false when new submissions are below threshold', async () => {
            // Mock exam query: 1000 total, 980 at last norm (20 new = 2%)
            mockWhere.mockResolvedValueOnce([{
                totalSubmissions: 1000,
                subsAtLastNormalization: 980,
                reNormThreshold: 5,
                lastNormalizedAt: new Date(),
            }]);

            const result = await checkSignificance(1);

            expect(result.isSignificant).toBe(false);
            expect(result.newCount).toBe(20);
            expect(result.percentNew).toBeCloseTo(2.04, 2);
        });

        it('should return isSignificant=true when new submissions exceed threshold', async () => {
            // Mock exam query: 1060 total, 1000 at last norm (60 new = 6%)
            mockWhere.mockResolvedValueOnce([{
                totalSubmissions: 1060,
                subsAtLastNormalization: 1000,
                reNormThreshold: 5,
                lastNormalizedAt: new Date(),
            }]);

            const result = await checkSignificance(1);

            expect(result.isSignificant).toBe(true);
            expect(result.newCount).toBe(60);
            expect(result.percentNew).toBe(6);
        });
    });

    describe('normalizeNewSubmission', () => {
        it('should return null if exam has no lastNormalizedAt (never batch normalized)', async () => {
            // Mock exam query
            mockWhere.mockResolvedValueOnce([{
                hasNormalization: true,
                lastNormalizedAt: null, // Never run
            }]);

            const result = await normalizeNewSubmission(100, 1, 1, 120);
            expect(result).toBeNull();
        });

        it('should calculate normalized score using cached shift stats for z_score', async () => {
            // 1. Mock exam query
            mockWhere.mockResolvedValueOnce([{
                hasNormalization: true,
                lastNormalizedAt: new Date(),
                normalizationMethod: 'z_score',
                totalMarks: 200,
            }]);

            // 2. Mock shift query (Mean=100, StdDev=20)
            mockWhere.mockResolvedValueOnce([{
                candidateCount: 50,
                avgRawScore: 100,
                stdDev: 20,
            }]);

            // 3. Mock global stats query (Mean=110, StdDev=25)
            mockWhere.mockResolvedValueOnce([{
                avg: 110,
                std: 25,
            }]);

            // Call
            const rawScore = 120; // (120 - 100) / 20 = 1.0 sigma -> 1.0 * 25 + 110 = 135
            const result = await normalizeNewSubmission(100, 1, 1, rawScore);

            expect(result).toBe(135);

            // Verify update was called
            expect(mockUpdate).toHaveBeenCalled();
            expect(mockSet).toHaveBeenCalledWith({ normalizedScore: 135 });
        });
    });

    describe('handlePostSubmission', () => {
        it('should orchestrate the incremental flow', async () => {
            // Spy on internal functions
            const normalizeSpy = vi.spyOn(IncrementalService, 'normalizeNewSubmission');
            // We can't easily spy on the top-level exports from the same module in Vitest without complications, 
            // but we can verify the DB calls they make.

            // 1. normalizeNewSubmission mocks
            // Exam query
            mockWhere.mockResolvedValueOnce([{
                hasNormalization: true,
                lastNormalizedAt: new Date(),
                normalizationMethod: 'z_score',
            }]);
            // Shift query
            mockWhere.mockResolvedValueOnce([{ avgRawScore: 100, stdDev: 20 }]);
            // Global stats
            mockWhere.mockResolvedValueOnce([{ avg: 110, std: 25 }]);

            // 2. recalculateRanks executes SQL 3 times
            // 3. checkSignificance query
            mockWhere.mockResolvedValueOnce([{
                totalSubmissions: 1010,
                subsAtLastNormalization: 1000,
                reNormThreshold: 5,
            }]);

            // Fetch updated rank query (for return value)
            mockWhere.mockResolvedValueOnce([{ overallRank: 42 }]);

            const result = await handlePostSubmission(100, 1, 1, 120);

            expect(result.normalizedScore).toBe(135);
            expect(result.ranksRecalculated).toBe(true);
            expect(result.significance.isSignificant).toBe(false);

            // Verify window functions were executed
            expect(mockExecute).toHaveBeenCalledTimes(3);
        });
    });
});
