import type {
    AuraKnowledgeArticle,
  } from '../types/auraIntelligence';
  
  import type {
    AuraKnowledgeGovernanceMetadata,
  } from '../types/auraKnowledgeGovernance';
  
  export const buildDefaultKnowledgeGovernance = ({
    ownerId,
    ownerEmail,
  }: {
    ownerId?: string;
    ownerEmail?: string;
  } = {}): AuraKnowledgeGovernanceMetadata => {
    const now = new Date();
    const nextReviewDate = new Date(now);
  
    nextReviewDate.setMonth(nextReviewDate.getMonth() + 6);
  
    return {
      version: 1,
      lifecycleStatus: 'draft',
      reviewRisk: 'low',
      ownerId,
      ownerEmail,
      reviewedAt: now.toISOString(),
      nextReviewAt: nextReviewDate.toISOString(),
      duplicateCandidateIds: [],
    };
  };
  
  export const shouldKnowledgeArticleBeReviewed = (
    article: AuraKnowledgeArticle & {
      governance?: AuraKnowledgeGovernanceMetadata;
    }
  ): boolean => {
    const nextReviewAt = article.governance?.nextReviewAt;
  
    if (!nextReviewAt) return true;
  
    return new Date(nextReviewAt).getTime() <= Date.now();
  };
  
  export const isKnowledgeArticleObsolete = (
    article: AuraKnowledgeArticle & {
      governance?: AuraKnowledgeGovernanceMetadata;
    }
  ): boolean => {
    return article.governance?.lifecycleStatus === 'obsolete';
  };
  
  export const incrementKnowledgeVersion = (
    governance?: AuraKnowledgeGovernanceMetadata
  ): AuraKnowledgeGovernanceMetadata => {
    const base = governance || buildDefaultKnowledgeGovernance();
  
    return {
      ...base,
      version: base.version + 1,
      lifecycleStatus: 'under_review',
      reviewedAt: new Date().toISOString(),
    };
  };