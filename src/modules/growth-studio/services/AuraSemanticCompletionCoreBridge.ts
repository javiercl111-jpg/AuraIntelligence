import type {
  IAuraSemanticCompletionPort,
  AuraSemanticCompletionRequest,
  AuraSemanticCompletionResponse,
} from './contracts/IAuraSemanticCompletionPort';

import type {
  AuraSemanticCoreResponse,
} from '../../../types/auraSemanticCompletion';

export interface AuraSemanticCoreServicePort {
  isAvailable(): Promise<boolean>;

  complete(
    request: {
      readonly requestId: string;
      readonly systemInstruction: string;
      readonly userPayload: string;
    },
  ): Promise<AuraSemanticCoreResponse>;
}

export class AuraSemanticCompletionCoreBridge
implements IAuraSemanticCompletionPort {
  private readonly core:
    AuraSemanticCoreServicePort;

  constructor(
    core:
      AuraSemanticCoreServicePort,
  ) {
    this.core =
      core;
  }

  async isAvailable(): Promise<boolean> {
    try {
      return await this.core.isAvailable();
    }
    catch {
      return false;
    }
  }

  async complete(
    request: AuraSemanticCompletionRequest,
  ): Promise<AuraSemanticCompletionResponse> {
    const response =
      await this.core.complete({
        requestId:
          request.requestId,

        systemInstruction:
          request.systemInstruction,

        userPayload:
          request.userPayload,
      });

    if (
      response.status !== 'available' ||
      !response.content ||
      response.content.trim().length === 0
    ) {
      throw new Error(
        response.failureReason ||
        'Aura semantic completion is unavailable.',
      );
    }

    return {
      content:
        response.content,

      provider:
        response.provider,

      model:
        response.model,

      durationMs:
        response.durationMs,

      tokenUsage:
        response.tokenUsage,
    };
  }
}
