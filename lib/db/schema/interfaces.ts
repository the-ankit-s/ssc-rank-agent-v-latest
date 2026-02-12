export interface SectionConfig {
  code: string;
  label: string;
  maxMarks: number;
  questions: number;
  positive: number;
  negative: number;
  order: number;
  isQualifying: boolean;
  timeLimit?: number;
}

export interface SectionPerformance {
  marks: number;
  correct: number;
  wrong: number;
  unattempted: number;
  accuracy?: number;
  percentile?: number;
}

export interface JobMetadata {
  examId?: number;
  shiftId?: number;
  durationMs?: number;
  triggeredBy?: string;
  affectedRows?: number;
}

export interface PercentileCutoffs {
  [percentile: string]: number;
}
