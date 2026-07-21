import type { ProviderInstruction } from '../../types';

export interface ProviderResponse {
  content: string;
  metadata: Record<string, unknown>;
  durationMs: number;
}

export interface IAIProviderAdapter {
  providerId: string;
  capabilities: string[];

  prepare(instruction: ProviderInstruction): Promise<Record<string, unknown>>;
  generate(preparedPayload: Record<string, unknown>): Promise<unknown>;
  normalize(rawResponse: unknown): ProviderResponse;
  validate(response: ProviderResponse): boolean;
  health(): Promise<boolean>;
}
