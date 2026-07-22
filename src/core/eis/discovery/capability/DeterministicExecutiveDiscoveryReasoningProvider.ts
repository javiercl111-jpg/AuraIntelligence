import type {
  ExecutiveBusinessFact,
  ExecutiveConfidence,
  ExecutiveDiagnosis,
  ExecutiveDiscoveryEvidence,
  ExecutiveDiscoveryRequest,
} from '../contracts';
import {
  DiscoveryEvidenceClassification,
  ExecutiveConfidenceLevel,
  ExecutiveDiagnosisStatus,
  ExecutiveMaturityLevel,
} from '../enums';
import type {
  ExecutiveDiscoveryReasoningContext,
  ExecutiveDiscoveryReasoningProvider,
} from '../ports';

const PROVIDER_ID = 'DETERMINISTIC_EXECUTIVE_DISCOVERY';
const PROVIDER_VERSION = '1.0.0';
const CONFIDENCE_CALIBRATION_VERSION = 'deterministic-v1';

function roundScore(score: number): number {
  return Math.round(score * 10_000) / 10_000;
}

function confidenceLevel(score: number): ExecutiveConfidence['level'] {
  if (score >= 0.85) return ExecutiveConfidenceLevel.VERY_HIGH;
  if (score >= 0.65) return ExecutiveConfidenceLevel.HIGH;
  if (score >= 0.4) return ExecutiveConfidenceLevel.MEDIUM;
  return ExecutiveConfidenceLevel.LOW;
}

function evidenceWeight(evidence: ExecutiveDiscoveryEvidence): number {
  if (evidence.classification === DiscoveryEvidenceClassification.USER_CONFIRMED) return 1;
  if (evidence.classification === DiscoveryEvidenceClassification.SYSTEM_OBSERVED) return 0.75;
  if (evidence.classification === DiscoveryEvidenceClassification.INFERRED) return 0.4;
  return 0;
}

function evidenceKey(evidence: ExecutiveDiscoveryEvidence): string {
  return evidence.fieldId ?? evidence.questionId ?? evidence.sourceReference;
}

function evidenceValueKey(evidence: ExecutiveDiscoveryEvidence): string {
  return JSON.stringify(evidence.normalizedValue ?? evidence.value);
}

function countContradictions(evidence: readonly ExecutiveDiscoveryEvidence[]): number {
  const valuesByKey = new Map<string, string>();
  const contradictedKeys = new Set<string>();

  evidence.forEach((item) => {
    if (item.classification === DiscoveryEvidenceClassification.MISSING) return;
    const key = evidenceKey(item);
    const value = evidenceValueKey(item);
    const previousValue = valuesByKey.get(key);
    if (previousValue !== undefined && previousValue !== value) {
      contradictedKeys.add(key);
    } else if (previousValue === undefined) {
      valuesByKey.set(key, value);
    }
  });

  return contradictedKeys.size;
}

function buildConfidence(
  evidence: readonly ExecutiveDiscoveryEvidence[],
  contradictionCount: number,
): ExecutiveConfidence {
  const supportedEvidence = evidence.filter(
    (item) => item.classification !== DiscoveryEvidenceClassification.MISSING,
  );
  const missingEvidenceCount = evidence.length - supportedEvidence.length;
  const confirmedCount = supportedEvidence.filter(
    (item) => item.classification === DiscoveryEvidenceClassification.USER_CONFIRMED,
  ).length;
  const inferredCount = supportedEvidence.filter(
    (item) => item.classification === DiscoveryEvidenceClassification.INFERRED,
  ).length;
  const observedCount = supportedEvidence.filter(
    (item) => item.classification === DiscoveryEvidenceClassification.SYSTEM_OBSERVED,
  ).length;

  const weightedQuality =
    supportedEvidence.length === 0
      ? 0
      : supportedEvidence.reduce(
          (sum, item) => sum + item.confidence * evidenceWeight(item),
          0,
        ) / supportedEvidence.length;
  const coverage = evidence.length === 0 ? 0 : supportedEvidence.length / evidence.length;
  const contradictionPenalty = contradictionCount === 0 ? 1 : 1 / (1 + contradictionCount);
  const score = roundScore(weightedQuality * coverage * contradictionPenalty);

  return {
    level: confidenceLevel(score),
    score,
    basis: [
      `User-confirmed evidence: ${confirmedCount}.`,
      `System-observed evidence: ${observedCount}.`,
      `Inferred evidence: ${inferredCount}.`,
      `Missing evidence: ${missingEvidenceCount}.`,
      `Contradicted evidence keys: ${contradictionCount}.`,
    ],
    evidenceCount: supportedEvidence.length,
    missingEvidenceCount,
    calibrationVersion: CONFIDENCE_CALIBRATION_VERSION,
  };
}

function toBusinessFact(evidence: ExecutiveDiscoveryEvidence): ExecutiveBusinessFact {
  return {
    label: evidenceKey(evidence),
    value: evidence.normalizedValue ?? evidence.value,
    classification: evidence.classification,
    evidenceIds: [evidence.evidenceId],
  };
}

export class DeterministicExecutiveDiscoveryReasoningProvider
  implements ExecutiveDiscoveryReasoningProvider
{
  readonly providerId = PROVIDER_ID;
  readonly providerVersion = PROVIDER_VERSION;

  reason(
    request: ExecutiveDiscoveryRequest,
    context: Readonly<ExecutiveDiscoveryReasoningContext>,
  ): Promise<ExecutiveDiagnosis> {
    const confirmed = request.evidence.filter(
      (item) => item.classification === DiscoveryEvidenceClassification.USER_CONFIRMED,
    );
    const inferred = request.evidence.filter(
      (item) => item.classification === DiscoveryEvidenceClassification.INFERRED,
    );
    const observed = request.evidence.filter(
      (item) => item.classification === DiscoveryEvidenceClassification.SYSTEM_OBSERVED,
    );
    const missing = request.evidence.filter(
      (item) => item.classification === DiscoveryEvidenceClassification.MISSING,
    );
    const supportedEvidence = [...confirmed, ...observed, ...inferred];
    const contradictionCount = countContradictions(request.evidence);
    const confidence = buildConfidence(request.evidence, contradictionCount);
    const hasPrimaryEvidence = confirmed.length + observed.length > 0;
    const insufficientEvidence = supportedEvidence.length < 2 || !hasPrimaryEvidence;
    const warnings: string[] = [];

    if (insufficientEvidence) {
      warnings.push('Evidence is insufficient for supported executive conclusions.');
    }
    if (missing.length > 0) {
      warnings.push(`${missing.length} requested evidence item(s) are marked as missing.`);
    }
    if (inferred.length > 0) {
      warnings.push(`${inferred.length} evidence item(s) are inferred rather than confirmed.`);
    }
    if (contradictionCount > 0) {
      warnings.push(`${contradictionCount} evidence key(s) contain contradictory values.`);
    }
    warnings.push('No explicit maturity measurements were supplied; maturity was not assessed.');

    const diagnosis: ExecutiveDiagnosis = {
      diagnosisId: context.idFactory.createId(
        'diagnosis',
        `${request.organizationId}:${request.sessionId}:${request.requestId}`,
      ),
      schemaVersion: request.schemaVersion,
      capabilityVersion: request.capabilityVersion,
      organizationId: request.organizationId,
      tenantId: request.tenantId,
      companyId: request.companyId,
      sessionId: request.sessionId,
      status: insufficientEvidence
        ? ExecutiveDiagnosisStatus.INSUFFICIENT_EVIDENCE
        : ExecutiveDiagnosisStatus.PARTIAL,
      executiveSummary: insufficientEvidence
        ? 'Insufficient evidence is available to produce supported executive conclusions.'
        : 'This partial diagnosis summarizes only the supplied evidence; no unsupported conclusions were generated.',
      businessSnapshot: {
        confirmedFacts: confirmed.map(toBusinessFact),
        inferredFacts: inferred.map(toBusinessFact),
        systemObservations: observed.map(toBusinessFact),
        missingInformation: missing.map((item) => ({
          label: evidenceKey(item),
          evidenceIds: [item.evidenceId],
        })),
      },
      maturity: {
        overallScore: 0,
        level: ExecutiveMaturityLevel.INITIAL,
        dimensions: [],
        rationale:
          'No explicit maturity measurements were supplied. The zero placeholder is not a maturity assessment.',
        evidenceIds: [],
        confidence: {
          level: ExecutiveConfidenceLevel.LOW,
          score: 0,
          basis: ['No evidence explicitly measured an executive maturity dimension.'],
          evidenceCount: 0,
          missingEvidenceCount: missing.length,
          calibrationVersion: CONFIDENCE_CALIBRATION_VERSION,
        },
      },
      risks: [],
      opportunities: [],
      recommendations: [],
      actions: [],
      confidence,
      evidenceIds: supportedEvidence.map((item) => item.evidenceId),
      warnings,
      generatedAt: context.generatedAt,
      generationMetadata: {
        requestId: request.requestId,
        correlationId: request.correlationId,
        providerId: this.providerId,
        providerVersion: this.providerVersion,
        deterministic: true,
      },
    };

    return Promise.resolve(diagnosis);
  }
}
