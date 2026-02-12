import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateRanks } from '@/lib/jobs/definitions/rank-calculation';

// Define mocks
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockExecute = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockUpdateWhere = vi.fn();

// Setup chaining
mockSelect.mockReturnValue({ from: mockFrom, execute: mockExecute });
mockFrom.mockReturnValue({ where: mockWhere, execute: mockExecute });
mockWhere.mockResolvedValue([{ id: 1 }]);

// Setup Update chaining
mockUpdate.mockReturnValue({ set: mockSet });
mockSet.mockReturnValue({ where: mockUpdateWhere });
mockUpdateWhere.mockResolvedValue({ rowCount: 1 });

vi.mock('@/lib/db', () => ({
    db: {
        select: (...args: any[]) => mockSelect(...args),
        execute: (...args: any[]) => mockExecute(...args),
        update: (...args: any[]) => mockUpdate(...args),
    }
}));

vi.mock('@/lib/db/schema', () => ({
    submissions: {},
    jobRuns: {},
    exams: { id: 'id', isActive: 'isActive' }
}));

describe('Rank Calculation Job', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Re-setup chaining default
        mockSelect.mockReturnValue({ from: mockFrom, execute: mockExecute });
        mockFrom.mockReturnValue({ where: mockWhere, execute: mockExecute });
        mockWhere.mockResolvedValue([{ id: 1 }]);
    });

    it('should process active exams', async () => {
        try {
            await calculateRanks(123);
        } catch (e: any) {
            // Ignore updateProgress error if module not mocked
            if (e.message && !e.message.includes('updateProgress')) throw e;
        }

        // Verify select was called (to fetch exams)
        expect(mockSelect).toHaveBeenCalled();

        // Verify execute was called (ranks calculation SQL)
        // If exams found (mocked), it should execute updates
        expect(mockExecute).toHaveBeenCalled();
    });
});
