import type {
  AuraSuggestedAction,
} from './auraAction';

import type {
  AuraPreparedAction,
} from './auraPreparedAction';

export type AuraSystem =
  | 'aura_hcm'
  | 'aura_maintenance'
  | 'aura_signature'
  | 'aura_control_center'
  | 'aura_intelligence'
  | 'unknown';

export type AuraLanguage = 'es' | 'en';

export type AuraKnowledgeStatus = 'draft' | 'published' | 'archived';

export type AuraUserRole =
  | 'SUPER_ADMIN'
  | 'DIRECTOR'
  | 'DIRECTOR_GENERAL'
  | 'SUBDIRECTOR'
  | 'HR_MANAGER'
  | 'HR_ADMIN'
  | 'RH'
  | 'TEAMLEADER'
  | 'SUBLEADER'
  | 'EMPLOYEE'
  | 'EXECUTIVE'
  | string;

export interface AuraIntelligenceContext {
  tenantId: string;
  companyId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  role?: AuraUserRole;
  profileId?: string;
  permissions?: string[];
  system: AuraSystem;
  module?: string;
  route?: string;
  language: AuraLanguage;
}

export interface AuraKnowledgeArticle {
  id: string;
  title: string;
  content: string;
  system: AuraSystem;
  module?: string;
  category?: string;
  tags: string[];
  language: AuraLanguage;
  status: AuraKnowledgeStatus;
  visibilityRoles?: AuraUserRole[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AuraConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface AuraConversationAudit {
  id?: string;
  tenantId: string;
  companyId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  system: AuraSystem;
  module?: string;
  route?: string;
  language: AuraLanguage;
  question: string;
  answer: string;
  matchedArticleIds: string[];
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface AuraAskRequest {
  question: string;
  context: AuraIntelligenceContext;
}

export interface AuraAskSource {
  articleId: string;
  title: string;
  system: AuraSystem | string;
  module?: string;
  category?: string;
}

export interface AuraAskResponse {
  answer: string;
  matchedArticles: AuraKnowledgeArticle[];
  confidence: 'low' | 'medium' | 'high';
  confidenceScore?: number;
  sources?: AuraAskSource[];
  relatedArticles?: AuraAskSource[];
  suggestedActions?: AuraSuggestedAction[];
  preparedAction?: AuraPreparedAction | null;
}