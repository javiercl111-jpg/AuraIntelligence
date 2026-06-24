export type AuraKnowledgeLifecycleStatus =
  | 'draft'
  | 'published'
  | 'under_review'
  | 'approved'
  | 'obsolete'
  | 'archived';

export type AuraKnowledgeReviewRisk =
  | 'low'
  | 'medium'
  | 'high';

export interface AuraKnowledgeGovernanceMetadata {
  version: number;
  lifecycleStatus: AuraKnowledgeLifecycleStatus;
  reviewRisk: AuraKnowledgeReviewRisk;
  ownerId?: string;
  ownerEmail?: string;
  approvedBy?: string;
  approvedAt?: string;
  reviewedAt?: string;
  nextReviewAt?: string;
  replacedByArticleId?: string;
  replacesArticleId?: string;
  duplicateCandidateIds?: string[];
  governanceNotes?: string;
}