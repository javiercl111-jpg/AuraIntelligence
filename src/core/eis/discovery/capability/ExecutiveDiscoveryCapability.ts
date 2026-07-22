import { CapabilityErrorCategory } from '../../types';
import type { CapabilityError } from '../../types';
import type {
  ExecutiveDiagnosis,
  ExecutiveDiscoveryRequest,
  ExecutiveDiscoveryResult,
} from '../contracts';
import { EXECUTIVE_DISCOVERY_CAPABILITY_VERSION } from '../contracts';
import { ExecutiveDiscoveryErrorCode } from '../errors';
import {
  normalizeExecutiveDiscoveryRequest,
  redactDiscoveryEvidence,
} from '../normalization';
import type {
  ExecutiveDiscoveryClock,
  ExecutiveDiscoveryIdFactory,
  ExecutiveDiscoveryReasoningProvider,
} from '../ports';
import {
  validateExecutiveDiagnosis,
  validateExecutiveDiscoveryRequest,
} from '../validators';

const CAPABILITY_ID = 'EXECUTIVE_DISCOVERY';
const UNKNOWN_CORRELATION_ID = 'UNAVAILABLE';
const UNKNOWN_TIME = 'UNAVAILABLE';

export interface ExecutiveDiscoveryCapabilityDependencies {
  readonly clock: ExecutiveDiscoveryClock;
  readonly idFactory: ExecutiveDiscoveryIdFactory;
  readonly reasoningProvider: ExecutiveDiscoveryReasoningProvider;
}

function readCorrelationId(input: unknown): string {
  try {
    if (typeof input !== 'object' || input === null) return UNKNOWN_CORRELATION_ID;
    const correlationId = (input as Readonly<Record<string, unknown>>).correlationId;
    return typeof correlationId === 'string' && correlationId.trim().length > 0
      ? correlationId.trim()
      : UNKNOWN_CORRELATION_ID;
  } catch {
    return UNKNOWN_CORRELATION_ID;
  }
}

export class ExecutiveDiscoveryCapability {
  readonly capabilityId = CAPABILITY_ID;
  readonly capabilityVersion = EXECUTIVE_DISCOVERY_CAPABILITY_VERSION;

  private readonly clock: ExecutiveDiscoveryClock;
  private readonly idFactory: ExecutiveDiscoveryIdFactory;
  private readonly reasoningProvider: ExecutiveDiscoveryReasoningProvider;

  constructor(dependencies: Readonly<ExecutiveDiscoveryCapabilityDependencies>) {
    this.clock = dependencies.clock;
    this.idFactory = dependencies.idFactory;
    this.reasoningProvider = dependencies.reasoningProvider;
  }

  private readClock(fallback: string): string {
    try {
      return this.clock.now();
    } catch {
      return fallback;
    }
  }

  private failure(
    error: Readonly<CapabilityError>,
    correlationId: string,
    startedAt: string,
    warnings: readonly string[] = [],
  ): ExecutiveDiscoveryResult {
    return {
      success: false,
      error,
      warnings,
      correlationId,
      executionMetadata: {
        capabilityId: this.capabilityId,
        capabilityVersion: this.capabilityVersion,
        providerId: this.reasoningProvider.providerId,
        providerVersion: this.reasoningProvider.providerVersion,
        startedAt,
        completedAt: this.readClock(startedAt),
      },
    };
  }

  private success(
    diagnosis: ExecutiveDiagnosis,
    correlationId: string,
    startedAt: string,
    warnings: readonly string[],
  ): ExecutiveDiscoveryResult {
    return {
      success: true,
      result: diagnosis,
      warnings,
      correlationId,
      executionMetadata: {
        capabilityId: this.capabilityId,
        capabilityVersion: this.capabilityVersion,
        providerId: this.reasoningProvider.providerId,
        providerVersion: this.reasoningProvider.providerVersion,
        startedAt,
        completedAt: this.readClock(startedAt),
      },
    };
  }

  async execute(input: unknown): Promise<ExecutiveDiscoveryResult> {
    const correlationId = readCorrelationId(input);
    const startedAt = this.readClock(UNKNOWN_TIME);

    try {
      const requestValidation = validateExecutiveDiscoveryRequest(input);
      if (!requestValidation.success) {
        return this.failure(requestValidation.error, correlationId, startedAt);
      }

      const normalizedRequest = normalizeExecutiveDiscoveryRequest(requestValidation.data);
      const redactedEvidence = normalizedRequest.evidence.map(redactDiscoveryEvidence);
      const redactionApplied = normalizedRequest.evidence.some(
        (item, index) => JSON.stringify(item) !== JSON.stringify(redactedEvidence[index]),
      );
      const reasoningRequest: ExecutiveDiscoveryRequest = {
        ...normalizedRequest,
        evidence: redactedEvidence,
      };

      let diagnosis: ExecutiveDiagnosis;
      try {
        diagnosis = await this.reasoningProvider.reason(reasoningRequest, {
          generatedAt: startedAt,
          idFactory: this.idFactory,
        });
      } catch {
        return this.failure(
          {
            code: ExecutiveDiscoveryErrorCode.REASONING_PROVIDER_FAILURE,
            message: 'The Executive Discovery reasoning provider could not complete the request.',
            category: CapabilityErrorCategory.REASONING,
            retryable: true,
          },
          reasoningRequest.correlationId,
          startedAt,
        );
      }

      const diagnosisValidation = validateExecutiveDiagnosis(diagnosis, reasoningRequest);
      if (!diagnosisValidation.success) {
        return this.failure(
          diagnosisValidation.error,
          reasoningRequest.correlationId,
          startedAt,
        );
      }

      const warnings = [
        ...diagnosisValidation.data.warnings,
        ...(redactionApplied
          ? ['Sensitive patterns were redacted from evidence before reasoning.']
          : []),
      ];
      return this.success(
        diagnosisValidation.data,
        reasoningRequest.correlationId,
        startedAt,
        warnings,
      );
    } catch {
      return this.failure(
        {
          code: ExecutiveDiscoveryErrorCode.INTERNAL_CAPABILITY_ERROR,
          message: 'The Executive Discovery capability could not complete the request.',
          category: CapabilityErrorCategory.INTERNAL,
          retryable: false,
        },
        correlationId,
        startedAt,
      );
    }
  }
}
