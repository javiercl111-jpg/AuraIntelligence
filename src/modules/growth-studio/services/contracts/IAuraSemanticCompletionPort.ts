export interface AuraSemanticCompletionRequest {
  readonly requestId: string;
  readonly systemInstruction: string;
  readonly userPayload: string;
}

export interface AuraSemanticCompletionResponse {
  readonly content: string;

  readonly provider?: string;
  readonly model?: string;

  readonly durationMs?: number;
  readonly tokenUsage?: number;
}

export interface IAuraSemanticCompletionPort {
  isAvailable(): Promise<boolean>;

  complete(
    request: AuraSemanticCompletionRequest,
  ): Promise<AuraSemanticCompletionResponse>;
}
