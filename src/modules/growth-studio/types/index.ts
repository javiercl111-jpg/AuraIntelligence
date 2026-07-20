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
  BrandBrainFieldStatus,
  BrandBrainConfidence,
  BrandBrainField,
  KnownFact,
  KnowledgeGap,
  CompanyProfile,
  BrandBrain
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

// Campaign Strategy
export type {
  CampaignStrategyFieldStatus,
  CampaignStrategyField,
  Assumption,
  StrategyRisk,
  ExecutionConstraints,
  CampaignStrategy,
} from './campaignStrategy';

// Executive Execution Plan
export type {
  ExecutiveExecutionArtifactStatus,
  FieldConfidenceStatus,
  ExecutionPhaseId,
  ExecutionPhaseState,
  ConfidentField,
  ExecutionAction,
  ExecutionDependency,
  ExecutionRisk,
  StrategicPhase,
  ExecutiveExecutionPlan,
} from './executiveExecutionPlan';

// Content Plan
export type {
  ContentAssetPhase,
  ContentAssetPriority,
  ContentAsset,
  AssetDependencyGraph,
  ProductionInput,
  ContentRisk,
  ContentPlan
} from './contentPlan';

// Executive Content Brief
export type {
  ExecutiveIntent,
  BriefStatus,
  ConstraintType,
  ChecklistStatus,
  NextActionType,
  SelectedAsset,
  OriginArtifact,
  SupportingEvidence,
  Constraint,
  SuccessCriterion,
  AcceptanceChecklist,
  BlockingReason,
  NextGenerationAction,
  ExecutiveContentBrief
} from './executiveContentBrief';

export default {};
