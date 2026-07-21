import type { GenerationTrace } from './generationTrace';

export type GenerationDraftStatus =
  | 'generation_pending'
  | 'generated'
  | 'validation_required'
  | 'revision_required'
  | 'approved'
  | 'rejected';

export interface ValidationViolation {
  ruleId: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface ValidationReport {
  status: GenerationDraftStatus;
  score: number;
  warnings: string[];
  violations: ValidationViolation[];
  recommendations: string[];
}

export interface GeneratedContentDraft {
  id: string;
  briefId: string;
  generationRequestId: string;
  provider: string;
  model: string;
  providerVersion: string;
  generationVersion: number;
  instructionVersion: number;
  providerInstructionId: string;
  traceabilityHash: string;
  generatedAt: string;
  generationDuration: number;
  status: GenerationDraftStatus;
  generatedContent: string;
  generationWarnings: string[];
  generationValidation: ValidationReport | null;
  generationTrace: GenerationTrace[];
  schemaVersion: string;
  createdAt: string;
  updatedAt: string;
}
