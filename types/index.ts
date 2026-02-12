/**
 * Centralized type definitions for SSC Rank Agent
 * 
 * This file re-exports commonly used types from across the application
 * to provide a single source of truth for shared type definitions.
 */

// Parser types
export type {
  SSCExamVariant,
  VendorID,
  SectionResult,
  ExamResult,
  CorrectOptionStrategy,
  ChosenOptionStrategy,
  VendorProfile,
} from '@/lib/parser/types';

export type { ExamConfig } from '@/lib/parser/config';

// Service types
export type {
  ParsedResponse,
  ParsedSubmission,
} from '@/lib/services/parser';

// Database enums (commonly used)
export {
  agencyEnum,
  examStatusEnum,
  analysisPhaseEnum,
  categoryEnum,
  genderEnum,
  jobStatusEnum,
  jobTypeEnum,
  logLevelEnum,
  confidenceLevelEnum,
  auditActionEnum,
  auditEntityEnum,
} from '@/lib/db/schema';

// Re-export schema types for convenience
export type {
  Exam,
  Shift,
  Submission,
  Cutoff,
  ScheduledJob,
  AppLog,
} from '@/lib/db/schema';
