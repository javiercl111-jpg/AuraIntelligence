import type {
    AuraKnowledgeArticle,
  } from './auraIntelligence';
  
  import type {
    AuraResolvedContext,
  } from './auraContext';
  
  import type {
    AuraIntentDetectionResult,
  } from './auraIntent';
  
  export type AuraAIProvider =
    | 'openai'
    | 'azure_openai'
    | 'anthropic'
    | 'gemini'
    | 'local_mock';
  
  export interface AuraAICompletionRequest {
    provider: AuraAIProvider;
    question: string;
    context: AuraResolvedContext;
    intent: AuraIntentDetectionResult;
    articles: AuraKnowledgeArticle[];
  }
  
  export interface AuraAICompletionResponse {
    answer: string;
    provider: AuraAIProvider;
    model?: string;
    usedArticleIds: string[];
    safetyNotes?: string[];
    raw?: unknown;
  }
  
  export interface AuraAIProviderConfig {
    provider: AuraAIProvider;
    enabled: boolean;
    model: string;
    temperature: number;
    maxTokens: number;
  }