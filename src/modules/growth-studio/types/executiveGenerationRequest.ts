import type { GenerationPolicy } from './generationPolicy';

export type ProviderCapability =
  | 'text_generation'
  | 'reasoning'
  | 'factual_accuracy'
  | 'creative_writing'
  | 'code_generation'
  | 'structured_output'
  | 'context_window_large';

export type GenerationIntent =
  | 'draft_creation'
  | 'summarization'
  | 'expansion'
  | 'tone_adjustment'
  | 'translation'
  | 'data_extraction';

export interface GenerationContentSection {
  id: string;
  heading: string;
  instructions: string;
  requiredElements?: string[];
  maxLength?: number;
}

export interface ExecutiveGenerationRequest {
  id: string;
  briefId: string;
  assetId: string;
  assetType: string;
  language: string;
  generationIntent: GenerationIntent;
  providerCapabilities: ProviderCapability[];
  contentSections: GenerationContentSection[];
  providerConstraints: string[];
  generationMetadata: Record<string, unknown>;
  policy: GenerationPolicy;
  schemaVersion: string;
  createdAt: string;
  updatedAt: string;
}
