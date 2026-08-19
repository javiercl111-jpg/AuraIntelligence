import type {
  AuraSemanticCompletionProvider,
  AuraSemanticCoreRequest,
  AuraSemanticCoreResponse,
} from '../types/auraSemanticCompletion';

export class AuraSemanticCompletionService {
  private readonly provider:
    AuraSemanticCompletionProvider | null;

  constructor(
    provider:
      AuraSemanticCompletionProvider | null,
  ) {
    this.provider =
      provider;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.provider) {
      return false;
    }

    try {
      return await this.provider.isAvailable();
    }
    catch {
      return false;
    }
  }

  async complete(
    request: AuraSemanticCoreRequest,
  ): Promise<AuraSemanticCoreResponse> {
    if (!this.provider) {
      return {
        status: 'unavailable',
        failureReason:
          'No semantic completion provider is configured.',
      };
    }

    let available = false;

    try {
      available =
        await this.provider.isAvailable();
    }
    catch {
      return {
        status: 'unavailable',
        provider:
          this.provider.providerId,
        failureReason:
          'Semantic completion provider availability check failed.',
      };
    }

    if (!available) {
      return {
        status: 'unavailable',
        provider:
          this.provider.providerId,
        failureReason:
          'Semantic completion provider is unavailable.',
      };
    }

    const startedAt =
      Date.now();

    try {
      const result =
        await this.provider.complete(
          request,
        );

      const durationMs =
        Math.max(
          0,
          Date.now() - startedAt,
        );

      if (
        !result.content ||
        result.content.trim().length === 0
      ) {
        return {
          status: 'failed',
          provider:
            this.provider.providerId,
          model:
            result.model,
          durationMs,
          tokenUsage:
            result.tokenUsage,
          failureReason:
            'Semantic completion provider returned empty content.',
        };
      }

      return {
        status: 'available',
        content:
          result.content,
        provider:
          this.provider.providerId,
        model:
          result.model,
        durationMs,
        tokenUsage:
          result.tokenUsage,
      };
    }
    catch {
      return {
        status: 'failed',
        provider:
          this.provider.providerId,
        durationMs:
          Math.max(
            0,
            Date.now() - startedAt,
          ),
        failureReason:
          'Semantic completion provider execution failed.',
      };
    }
  }
}
