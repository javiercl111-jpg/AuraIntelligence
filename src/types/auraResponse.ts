import type { AuraKnowledgeArticle } from './auraIntelligence';
import type { AuraIntentDetectionResult } from './auraIntent';

export interface AuraResponseSource {
  articleId: string;
  title: string;
  system: string;
  module?: string;
  category?: string;
}

export interface AuraResponseResult {
  answer: string;
  sources: AuraResponseSource[];
  relatedArticles: AuraResponseSource[];
  confidenceScore: number;
  confidenceLabel: 'low' | 'medium' | 'high';
  intent?: AuraIntentDetectionResult;
  matchedArticles: AuraKnowledgeArticle[];
}