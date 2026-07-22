import type {
  DiscoveryEvidenceClassification,
  ExecutiveDiagnosisStatus,
} from '../enums';
import type { DiscoveryJsonValue } from './ExecutiveDiscoveryEvidence';
import type { ExecutiveAction } from './ExecutiveAction';
import type { ExecutiveConfidence } from './ExecutiveConfidence';
import type { ExecutiveMaturity } from './ExecutiveMaturity';
import type { ExecutiveOpportunity } from './ExecutiveOpportunity';
import type { ExecutiveRecommendation } from './ExecutiveRecommendation';
import type { ExecutiveRisk } from './ExecutiveRisk';

export interface ExecutiveBusinessFact {
  readonly label: string;
  readonly value: DiscoveryJsonValue;
  readonly classification: DiscoveryEvidenceClassification;
  readonly evidenceIds: readonly string[];
}

export interface ExecutiveMissingInformation {
  readonly label: string;
  readonly evidenceIds: readonly string[];
}

export interface ExecutiveBusinessSnapshot {
  readonly confirmedFacts: readonly Readonly<ExecutiveBusinessFact>[];
  readonly inferredFacts: readonly Readonly<ExecutiveBusinessFact>[];
  readonly systemObservations: readonly Readonly<ExecutiveBusinessFact>[];
  readonly missingInformation: readonly Readonly<ExecutiveMissingInformation>[];
}

export interface ExecutiveDiagnosisGenerationMetadata {
  readonly requestId: string;
  readonly correlationId: string;
  readonly providerId: string;
  readonly providerVersion: string;
  readonly deterministic: boolean;
}

export interface ExecutiveDiagnosis {
  readonly diagnosisId: string;
  readonly schemaVersion: '1.0';
  readonly capabilityVersion: string;
  readonly organizationId: string;
  readonly tenantId: string;
  readonly companyId: string;
  readonly sessionId: string;
  readonly status: ExecutiveDiagnosisStatus;
  readonly executiveSummary: string;
  readonly businessSnapshot: Readonly<ExecutiveBusinessSnapshot>;
  readonly maturity: Readonly<ExecutiveMaturity>;
  readonly risks: readonly Readonly<ExecutiveRisk>[];
  readonly opportunities: readonly Readonly<ExecutiveOpportunity>[];
  readonly recommendations: readonly Readonly<ExecutiveRecommendation>[];
  readonly actions: readonly Readonly<ExecutiveAction>[];
  readonly confidence: Readonly<ExecutiveConfidence>;
  readonly evidenceIds: readonly string[];
  readonly warnings: readonly string[];
  readonly generatedAt: string;
  readonly generationMetadata: Readonly<ExecutiveDiagnosisGenerationMetadata>;
}
