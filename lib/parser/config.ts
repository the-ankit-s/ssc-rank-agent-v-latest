import type { SSCExamVariant } from "./types";

export interface ExamConfig {
    variant: SSCExamVariant;
    marks: { positive: number; negative: number };
    sectionMap: Record<string, string>;
}

export const EXAM_CONFIGS: Record<SSCExamVariant, ExamConfig> = {
    tier1: {
        variant: "tier1",
        marks: { positive: 2, negative: 0.5 },
        sectionMap: {
            "General Intelligence": "Reasoning",
            "General Awareness": "Awareness",
            "Quantitative Aptitude": "Quant",
            "English Comprehension": "English",
        },
    },
    tier2: {
        variant: "tier2",
        marks: { positive: 3, negative: 1 },
        sectionMap: {
            // Mains Modules
            "Module I Mathematical Abilities": "Quant",
            "Module I Reasoning": "Reasoning",
            "Module II English": "English",
            "Module II General Awareness": "Awareness",
            "Module III Computer": "Computer",

            // Fallbacks
            "Mathematical Abilities": "Quant",
            "Reasoning and General Intelligence": "Reasoning",
            "General Awareness": "Awareness",
            "English Language": "English",
            "Computer Knowledge": "Computer",
            Quantitative: "Quant",
        },
    },
};
