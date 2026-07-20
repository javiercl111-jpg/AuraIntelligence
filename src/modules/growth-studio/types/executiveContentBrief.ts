import type { ConfidentField, FieldConfidenceStatus } from './executiveExecutionPlan';

export type ExecutiveIntent = 'awareness' | 'education' | 'trust' | 'consideration' | 'conversion' | 'retention' | 'internal_alignment' | 'unknown';
export type BriefStatus = 'draft' | 'review_required' | 'approved';
export type ConstraintType = 'business' | 'brand' | 'legal' | 'platform_policy' | 'evidence';
export type ChecklistStatus = 'pending' | 'satisfied' | 'not_applicable';
export type NextActionType = 'review_brief' | 'approve_brief' | 'generate_asset';

export interface SelectedAsset {
  assetId: string;
  title: string;
}

export interface OriginArtifact {
  type: string;
  id: string;
  schemaVersion: string;
  fieldsUsed: string[];
}

export interface SupportingEvidence {
  artifactType: string;
  artifactId: string;
  field: string;
  value: unknown;
  source: string;
  evidence: string;
  status: FieldConfidenceStatus;
}

export interface Constraint {
  id: string;
  type: ConstraintType;
  description: string;
  source: string;
  status: FieldConfidenceStatus;
}

export interface SuccessCriterion {
  id: string;
  description: string;
  isVerifiable: boolean;
  status: FieldConfidenceStatus;
}

export interface AcceptanceChecklist {
  id: string;
  label: string;
  required: boolean;
  status: ChecklistStatus;
  source: string;
}

export interface BlockingReason {
  id: string;
  description: string;
  criticality: 'blocker' | 'warning';
}

export interface NextGenerationAction {
  action: NextActionType;
  assetId: string;
  label: string;
  isEnabled: boolean;
  blockingReason?: string;
}

export interface ExecutiveContentBrief {
  id: string;
  conversationId: string;
  contentPlanId: string;
  selectedAssetId: string;
  status: BriefStatus;
  schemaVersion: string;
  createdAt: string;
  updatedAt: string;

  briefGoal: ConfidentField<string>;
  selectedAsset: SelectedAsset | null;
  assetPurpose: ConfidentField<string>;
  businessContext: ConfidentField<string>;
  targetAudience: ConfidentField<string>;

  executiveIntent: ConfidentField<ExecutiveIntent>;
  coreMessage: ConfidentField<string>;

  brandGuidelines: ConfidentField<string[]>;
  tone: ConfidentField<string>;
  distributionTargets: ConfidentField<string[]>;

  originArtifacts: OriginArtifact[];
  supportingEvidence: SupportingEvidence[];
  constraints: Constraint[];
  successCriteria: SuccessCriterion[];
  acceptanceChecklist: AcceptanceChecklist[];

  briefReadiness: number; // 0-100
  briefReadinessReason: string;
  isBlocked: boolean;
  blockingReasons: BlockingReason[];

  nextGenerationAction: NextGenerationAction;
}
