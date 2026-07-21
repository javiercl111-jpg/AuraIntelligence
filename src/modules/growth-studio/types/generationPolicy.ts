export type GenerationPolicyLevel = 'strict' | 'balanced' | 'creative';

export interface GenerationPolicy {
  id: string;
  name: string;
  level: GenerationPolicyLevel;
  requireDeterministicOutput: boolean;
  temperature: number;
  maxTokens?: number;
  allowedProviders: string[];
  blockedModels: string[];
  mandatoryCapabilities: string[]; // references ProviderCapability
}

export const STRICT_POLICY: GenerationPolicy = {
  id: 'pol_strict_01',
  name: 'Strict Factual Policy',
  level: 'strict',
  requireDeterministicOutput: true,
  temperature: 0.0,
  allowedProviders: [],
  blockedModels: [],
  mandatoryCapabilities: ['reasoning', 'factual_accuracy'],
};

export const CREATIVE_POLICY: GenerationPolicy = {
  id: 'pol_creative_01',
  name: 'Creative Brainstorming Policy',
  level: 'creative',
  requireDeterministicOutput: false,
  temperature: 0.8,
  allowedProviders: [],
  blockedModels: [],
  mandatoryCapabilities: ['creative_writing'],
};
