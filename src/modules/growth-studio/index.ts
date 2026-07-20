// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Module Public API
// ─────────────────────────────────────────────────────────────

// Component
export { default as GrowthStudioEntry } from './components/GrowthStudioEntry';
export { default as ExecutiveConversationPage } from './components/ExecutiveConversationPage';
export { default as GrowthObjectiveSummary } from './components/GrowthObjectiveSummary';
export { default as GrowthObjectiveCard } from './components/GrowthObjectiveCard';
export { default as CompletionIndicator } from './components/CompletionIndicator';
export { default as MissingInformationBadge } from './components/MissingInformationBadge';
export { default as BrandBrainSummary } from './components/BrandBrainSummary';
export { default as BrandBrainCard } from './components/BrandBrainCard';
export { default as KnowledgeGapCard } from './components/KnowledgeGapCard';
export { default as ConfidenceIndicator } from './components/ConfidenceIndicator';
export { ExecutiveExecutionPlanSummary } from './components/ExecutiveExecutionPlanSummary';
export { ExecutiveExecutionPlanCard } from './components/ExecutiveExecutionPlanCard';
export { ExecutionReadinessIndicator } from './components/ExecutionReadinessIndicator';
export { ExecutionTimeline } from './components/ExecutionTimeline';
export { NextRecommendedActionCard } from './components/NextRecommendedActionCard';
export { ExecutionRisksCard } from './components/ExecutionRisksCard';
export * from './types/growthConversation';
export * from './types/growthObjective';

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
  BrandBrainFieldStatus,
  BrandBrainConfidence,
  BrandBrainField,
  KnownFact,
  KnowledgeGap,
  CompanyProfile,
  BrandBrain,
  GrowthApproval,
  GrowthApprovalStatus,
  ApprovableEntityType,
  GrowthWorkspace,
  GrowthWorkspaceStatus,
  GrowthAnalyticsSummary,
  GrowthMetricDataPoint,
  GrowthMetricType,
  AnalyticsTimeRange,
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
} from './types';

// Service Contracts
export type { IGrowthConversationService } from './services/contracts/IGrowthConversationService';
export type { IBrandBrainService } from './services/contracts/IBrandBrainService';
export type { ICampaignService } from './services/contracts/ICampaignService';
export type { IGrowthApprovalService } from './services/contracts/IGrowthApprovalService';
export type { IPublisherService } from './services/contracts/IPublisherService';
export type { IGrowthAIProvider } from './services/contracts/IGrowthAIProvider';
export type { IExecutiveExecutionPlanService } from './services/contracts/IExecutiveExecutionPlanService';

export default {};
