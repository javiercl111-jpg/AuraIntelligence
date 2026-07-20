// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Module Public API
// ─────────────────────────────────────────────────────────────

// Component
export { default as GrowthStudioEntry } from './components/GrowthStudioEntry';
export { default as ExecutiveConversationPage } from './components/ExecutiveConversationPage';

// Module Definition
export { GrowthStudioModuleDefinition } from './config/growthStudioModule';
export type { GrowthStudioModuleConfig } from './config/growthStudioModule';

// Capabilities
export { GROWTH_STUDIO_CAPABILITIES } from './config/growthStudioCapabilities';
export type { GrowthCapabilityKey, GrowthCapability } from './config/growthStudioCapabilities';

// Collections
export { GROWTH_COLLECTIONS } from './config/growthStudioCollections';
export type { GrowthCollectionName } from './config/growthStudioCollections';

// Types (re-export from barrel)
export type {
  GrowthObjective,
  GrowthObjectiveStatus,
  GrowthHorizon,
  ConfidenceLevel,
  GrowthConversation,
  GrowthConversationStatus,
  GrowthConversationStage,
  GrowthConversationTurn,
  GrowthStructuredContext,
  TurnExtractedData,
  ConversationRole,
  GrowthCampaign,
  GrowthCampaignStatus,
  PublicationChannel,
  CampaignContentPiece,
  CampaignSchedule,
  BrandBrainProfile,
  BrandIdentity,
  BrandTone,
  BrandLanguageGuidelines,
  BrandAudience,
  BrandProductOrService,
  BrandVisualIdentityRef,
  BrandDataProvenance,
  BrandDataConfidence,
  GrowthApproval,
  GrowthApprovalStatus,
  ApprovableEntityType,
  GrowthWorkspace,
  GrowthWorkspaceStatus,
  GrowthAnalyticsSummary,
  GrowthMetricDataPoint,
  GrowthMetricType,
  AnalyticsTimeRange,
} from './types';

// Service Contracts
export type { IGrowthConversationService } from './services/contracts/IGrowthConversationService';
export type { IBrandBrainService } from './services/contracts/IBrandBrainService';
export type { ICampaignService } from './services/contracts/ICampaignService';
export type { IGrowthApprovalService } from './services/contracts/IGrowthApprovalService';
export type { IPublisherService } from './services/contracts/IPublisherService';
export type { IGrowthAIProvider } from './services/contracts/IGrowthAIProvider';

export default {};
