export type AuraSemanticCompletionStatus =
  | 'available'
  | 'unavailable'
  | 'failed';

export interface AuraSemanticCoreRequest {
  readonly requestId: string;

  readonly systemInstruction: string;
  readonly userPayload: string;
}

export interface AuraSemanticCoreResponse {
  readonly status: AuraSemanticCompletionStatus;

  /**
   * Present only when status === 'available'.
   */
  readonly content?: string;

  readonly provider?: string;
  readonly model?: string;

  readonly durationMs?: number;
  readonly tokenUsage?: number;

  readonly failureReason?: string;
}

export interface AuraSemanticCompletionProvider {
  readonly providerId: string;

  isAvailable(): Promise<boolean>;

  complete(
    request: AuraSemanticCoreRequest,
  ): Promise<{
    readonly content: string;
    readonly model?: string;
    readonly tokenUsage?: number;
  }>;
}
