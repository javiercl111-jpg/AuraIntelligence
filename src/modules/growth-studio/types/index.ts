// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Types Barrel Export
// ─────────────────────────────────────────────────────────────

// Growth Objective
export type {
  GrowthObjective,
  GrowthObjectiveStatus,
  GrowthHorizon,
  ConfidenceLevel,
} from './growthObjective';

// Growth Conversation
export type {
  GrowthConversation,
  GrowthConversationStatus,
  GrowthConversationStage,
  GrowthConversationTurn,
  GrowthStructuredContext,
  TurnExtractedData,
  ConversationRole,
} from './growthConversation';

// Growth Campaign
export type {
  GrowthCampaign,
  GrowthCampaignStatus,
  PublicationChannel,
  CampaignContentPiece,
  CampaignSchedule,
} from './growthCampaign';

// Brand Brain
export type {
  BrandBrainProfile,
  BrandIdentity,
  BrandTone,
  BrandLanguageGuidelines,
  BrandAudience,
  BrandProductOrService,
  BrandVisualIdentityRef,
  BrandDataProvenance,
  BrandDataConfidence,
} from './brandBrain';

// Growth Approval
export type {
  GrowthApproval,
  GrowthApprovalStatus,
  ApprovableEntityType,
} from './growthApproval';

// Growth Workspace
export type {
  GrowthWorkspace,
  GrowthWorkspaceStatus,
} from './growthWorkspace';

// Growth Analytics
export type {
  GrowthAnalyticsSummary,
  GrowthMetricDataPoint,
  GrowthMetricType,
  AnalyticsTimeRange,
} from './growthAnalytics';

export default {};
