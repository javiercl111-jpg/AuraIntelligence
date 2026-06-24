import type {
    AuraKnowledgeArticle,
  } from '../types/auraIntelligence';
  
  import type {
    AuraResponseResult,
    AuraResponseSource,
  } from '../types/auraResponse';
  
  import type {
    AuraIntentDetectionResult,
  } from '../types/auraIntent';
  
  import {
    composeAuraAnswer,
    getRelatedAuraArticles,
  } from './auraResponseComposer';
  
  const MAX_SOURCES = 3;
  
  const buildSourceFromArticle = (
    article: AuraKnowledgeArticle
  ): AuraResponseSource => ({
    articleId: article.id,
    title: article.title,
    system: article.system,
    module: article.module,
    category: article.category,
  });
  
  const calculateConfidenceScore = ({
    articleCount,
    intent,
  }: {
    articleCount: number;
    intent?: AuraIntentDetectionResult;
  }): number => {
    let score = 0;
  
    if (articleCount > 0) score += 45;
    if (articleCount > 1) score += 10;
    if (articleCount > 2) score += 5;
  
    if (intent) {
      score += Math.round(intent.confidence * 35);
    }
  
    return Math.min(99, score);
  };
  
  const resolveConfidenceLabel = (
    confidenceScore: number
  ): 'low' | 'medium' | 'high' => {
    if (confidenceScore >= 75) return 'high';
    if (confidenceScore >= 45) return 'medium';
  
    return 'low';
  };
  
  export const buildAuraResponse = ({
    articles,
    intent,
  }: {
    articles: AuraKnowledgeArticle[];
    intent?: AuraIntentDetectionResult;
  }): AuraResponseResult => {
    const relatedArticleList = getRelatedAuraArticles(articles);
  
    const sources = articles
      .slice(0, MAX_SOURCES)
      .map(buildSourceFromArticle);
  
    const relatedArticles = relatedArticleList.map(buildSourceFromArticle);
  
    const confidenceScore = calculateConfidenceScore({
      articleCount: articles.length,
      intent,
    });
  
    return {
      answer: composeAuraAnswer(articles),
      sources,
      relatedArticles,
      confidenceScore,
      confidenceLabel: resolveConfidenceLabel(confidenceScore),
      intent,
      matchedArticles: articles,
    };
  };