import type {
  ConfidentField,
  FieldConfidenceStatus
} from './executiveExecutionPlan';

export type ContentAssetPhase = 'not_started' | 'ideation' | 'production' | 'review' | 'ready';
export type ContentAssetPriority = 'low' | 'medium' | 'high' | 'critical';
export type OriginArtifact = 'GrowthObjective' | 'BrandBrain' | 'CampaignStrategy' | 'ExecutionPlan';

export interface ContentAsset {
  id: string;
  title: string;
  objective: ConfidentField<string>;
  audience: ConfidentField<string>;
  phase: ContentAssetPhase;
  priority: ContentAssetPriority;
  distributionTargets: ConfidentField<string[]>;
  dependencyIds: string[];

  status: FieldConfidenceStatus;
  source?: string;
  evidence?: string;

  purpose: string;
  originArtifact: OriginArtifact;

  parents: string[];
  children: string[];
}

export interface AssetDependencyGraph {
  nodes: string[];
  edges: { from: string; to: string }[];
}

export interface ProductionInput {
  id: string;
  type: 'message' | 'cta' | 'audience' | 'channels';
  description: string;
  value: string | null;
  status: FieldConfidenceStatus;
  isReady: boolean;
  source?: string;
  evidence?: string;
}

export interface ContentDependency {
  id: string;
  description: string;
  status: 'resolved' | 'unresolved';
  criticality: 'low' | 'medium' | 'high' | 'blocker';
}

export interface ContentRisk {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigationStatus: 'planned' | 'active' | 'unmitigated';
  source?: string;
}

export interface ContentPlan {
  id: string;
  conversationId: string;
  status: 'draft' | 'confirmed';
  schemaVersion: string;
  createdAt: string;
  updatedAt: string;

  contentObjectives: ConfidentField<string[]>;
  productionPriorities: ConfidentField<string[]>;

  contentAssets: ContentAsset[]; // All assets in the plan
  knownAssets: ContentAsset[]; // Ready or known ones
  missingAssets: ContentAsset[]; // Assets to be produced

  assetDependencies: ContentDependency[];

  assetPipeline: AssetDependencyGraph;

  productionInputs: ProductionInput[];
  contentRisks: ContentRisk[];

  contentReadiness: number; // 0-100
  contentReadinessReason: string;
  isBlocked: boolean;

  nextRecommendedAsset: ContentAsset | null;
}
