import * as cheerio from "cheerio";

export interface ParsedResponse {
    questionNumber: number;
    section: string;
    selectedAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
}

export interface ParsedSubmission {
    rollNumber: string;
    name: string;
    fatherName?: string;
    dob?: string;
    examCentre?: string;
    responses: ParsedResponse[];
    metadata: {
        totalQuestions: number;
        attempted: number;
        correct: number;
        wrong: number;
        rawScore: number;
    };
}

/**
 * Parse SSC answer key HTML
 * This is a basic parser - you'll need to adjust selectors based on actual SSC HTML structure
 */
export async function parseSSCAnswerKey(url: string, password?: string): Promise<ParsedSubmission> {
    try {
        // In a real implementation, you'd need to:
        // 1. Handle authentication if password is required
        // 2. Fetch the HTML content
        // 3. Parse it with cheerio

        // For now, we'll simulate the parsing
        // In production, you'd fetch actual HTML:
        // const response = await fetch(url);
        // const html = await response.text();

        // Simulate parsed data
        const mockData: ParsedSubmission = {
            rollNumber: "SSC" + Math.random().toString().slice(2, 10),
            name: "Test Candidate",
            fatherName: "Test Father",
            dob: "01/01/2000",
            examCentre: "Delhi - Centre 001",
            responses: generateMockResponses(),
            metadata: {
                totalQuestions: 100,
                attempted: 95,
                correct: 70,
                wrong: 25,
                rawScore: 0,
            },
        };

        // Calculate raw score
        mockData.metadata.rawScore = calculateRawScore(mockData.responses);

        return mockData;
    } catch (error) {
        console.error("Error parsing answer key:", error);
        throw new Error("Failed to parse answer key. Please check the URL and try again.");
    }
}

/**
 * Generate mock responses for demo/testing
 */
function generateMockResponses(): ParsedResponse[] {
    const sections = [
        { code: "GI", name: "General Intelligence", questions: 25 },
        { code: "QA", name: "Quantitative Aptitude", questions: 25 },
        { code: "EN", name: "English", questions: 25 },
        { code: "GA", name: "General Awareness", questions: 25 },
    ];

    const responses: ParsedResponse[] = [];
    let qNumber = 1;

    for (const section of sections) {
        for (let i = 0; i < section.questions; i++) {
            const correct = String.fromCharCode(65 + Math.floor(Math.random() * 4)); // A, B, C, or D
            const attempted = Math.random() > 0.05; // 95% attempt rate
            const selected = attempted
                ? Math.random() > 0.25
                    ? correct
                    : String.fromCharCode(65 + Math.floor(Math.random() * 4))
                : null;

            responses.push({
                questionNumber: qNumber++,
                section: section.code,
                selectedAnswer: selected,
                correctAnswer: correct,
                isCorrect: selected === correct,
            });
        }
    }

    return responses;
}

/**
 * Calculate raw score based on responses
 * Default: +2 for correct, -0.5 for wrong
 */
export function calculateRawScore(
    responses: ParsedResponse[],
    positiveMarks = 2,
    negativeMarks = 0.5
): number {
    let score = 0;

    for (const response of responses) {
        if (response.selectedAnswer === null) {
            // Unattempted
            continue;
        } else if (response.isCorrect) {
            score += positiveMarks;
        } else {
            score -= negativeMarks;
        }
    }

    return Math.round(score * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate section-wise performance
 */
export function calculateSectionPerformance(responses: ParsedResponse[]) {
    const sections: Record<
        string,
        {
            attempted: number;
            correct: number;
            wrong: number;
            marks: number;
        }
    > = {};

    for (const response of responses) {
        if (!sections[response.section]) {
            sections[response.section] = {
                attempted: 0,
                correct: 0,
                wrong: 0,
                marks: 0,
            };
        }

        if (response.selectedAnswer !== null) {
            sections[response.section].attempted++;
            if (response.isCorrect) {
                sections[response.section].correct++;
                sections[response.section].marks += 2;
            } else {
                sections[response.section].wrong++;
                sections[response.section].marks -= 0.5;
            }
        }
    }

    return sections;
}

/**
 * Extract metadata from URL (e.g., exam code, shift)
 */
export function extractExamMetadata(url: string): {
    examCode?: string;
    shiftCode?: string;
} {
    // Example: extract from URL pattern
    // Real implementation would parse actual SSC URL structure
    return {
        examCode: "SSC-CGL-2024",
        shiftCode: "SHIFT-1",
    };
}
