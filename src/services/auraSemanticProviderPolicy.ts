export interface AuraSemanticProviderCapabilities {
  readonly providerId: string;

  readonly structuredOutput: boolean;
  readonly instructionFollowing: boolean;

  readonly semanticReasoning: boolean;

  readonly traceableModel: boolean;
  readonly usageReporting: boolean;

  readonly supportsDataMinimization: boolean;

  readonly maxExpectedLatencyMs?: number;

  /**
   * Relative operational cost tier.
   * This is governance metadata, not billing authority.
   */
  readonly costTier:
    | 'low'
    | 'medium'
    | 'high'
    | 'unknown';
}

export interface AuraSemanticProviderPolicyResult {
  readonly eligible: boolean;

  readonly blockingReasons: string[];

  readonly warnings: string[];
}

export const AURA_SEMANTIC_PROVIDER_POLICY = {
  maximumPreferredLatencyMs: 15_000,
} as const;

export class AuraSemanticProviderPolicy {
  static evaluate(
    capabilities:
      AuraSemanticProviderCapabilities,
  ): AuraSemanticProviderPolicyResult {
    const blockingReasons: string[] = [];
    const warnings: string[] = [];

    if (!capabilities.structuredOutput) {
      blockingReasons.push(
        'Provider does not support reliable structured output.',
      );
    }

    if (!capabilities.instructionFollowing) {
      blockingReasons.push(
        'Provider does not meet instruction-following requirements.',
      );
    }

    if (!capabilities.semanticReasoning) {
      blockingReasons.push(
        'Provider does not meet semantic reasoning requirements.',
      );
    }

    if (!capabilities.traceableModel) {
      blockingReasons.push(
        'Provider/model execution cannot be traced.',
      );
    }

    if (!capabilities.supportsDataMinimization) {
      blockingReasons.push(
        'Provider does not satisfy data-minimization requirements.',
      );
    }

    if (!capabilities.usageReporting) {
      warnings.push(
        'Provider does not report usage metadata.',
      );
    }

    if (
      capabilities.maxExpectedLatencyMs !== undefined &&
      capabilities.maxExpectedLatencyMs >
        AURA_SEMANTIC_PROVIDER_POLICY
          .maximumPreferredLatencyMs
    ) {
      warnings.push(
        'Provider expected latency exceeds the preferred semantic-analysis target.',
      );
    }

    if (
      capabilities.costTier ===
      'unknown'
    ) {
      warnings.push(
        'Provider operational cost tier is unknown.',
      );
    }

    return {
      eligible:
        blockingReasons.length === 0,

      blockingReasons,
      warnings,
    };
  }
}
