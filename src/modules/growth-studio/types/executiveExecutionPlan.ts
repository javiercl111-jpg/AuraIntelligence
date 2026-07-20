export type ExecutiveExecutionArtifactStatus = 'draft' | 'confirmed';

export type FieldConfidenceStatus = 'confirmed' | 'inferred' | 'missing';

export type ExecutionPhaseId =
  | 'preparation'
  | 'production'
  | 'validation'
  | 'launch'
  | 'follow_up';

export type ExecutionPhaseState =
  | 'not_started'
  | 'ready'
  | 'in_progress'
  | 'blocked'
  | 'completed';

export interface ConfidentField<T> {
  value: T;
  status: FieldConfidenceStatus;
  source?: string;
  evidence?: string;
}

export interface ExecutionAction {
  id: string;
  title: string;
  phase: ExecutionPhaseId;
  status: ExecutionPhaseState;
  priority: 'low' | 'medium' | 'high' | 'critical';
  source?: string;
  evidence?: string;
  dependencyIds: string[];
}

export interface ExecutionDependency {
  id: string;
  description: string;
  requiredForPhase: ExecutionPhaseId;
  source?: string;
  evidence?: string;
  criticality: 'low' | 'medium' | 'high' | 'blocker';
  status: 'resolved' | 'unresolved';
}

export interface ExecutionRisk {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source?: string;
  evidence?: string;
  mitigationStatus: 'planned' | 'active' | 'unmitigated';
}

export interface StrategicPhase {
  id: ExecutionPhaseId;
  label: string;
  state: ExecutionPhaseState;
  actions: ExecutionAction[];
  dependencies: ExecutionDependency[];
  risks: ExecutionRisk[];
}

export interface ExecutionConstraints {
  budget?: string;
  resources?: string[];
  timeframe?: string;
}

export interface ExecutiveExecutionPlan {
  // Metadatos
  id: string;
  conversationId: string;
  status: ExecutiveExecutionArtifactStatus;
  schemaVersion: string;
  createdAt: string;
  updatedAt: string;

  // Propiedades Principales
  executionGoal: ConfidentField<string | null>;
  businessJustification: ConfidentField<string | null>;
  strategicPhases: StrategicPhase[];
  executivePriorities: ConfidentField<string[]>;
  actionQueue: ExecutionAction[];
  campaignLaunchInputs: ConfidentField<string[]>;

  // Dependencias
  dependencies: ExecutionDependency[];
  knownDependencies: ExecutionDependency[];
  missingDependencies: ExecutionDependency[];

  // Riesgos
  executionRisks: ExecutionRisk[];

  // Restricciones (opcionales)
  executionConstraints?: ExecutionConstraints;

  // Preparación y Próximos pasos
  executionReadiness: number; // 0-100
  executionReadinessReason: string;
  isBlocked: boolean;
  nextRecommendedAction: ExecutionAction | null;
}
