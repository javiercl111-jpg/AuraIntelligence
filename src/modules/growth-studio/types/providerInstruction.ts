export interface ProviderMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ProviderInstruction {
  id: string;
  requestId: string;
  providerId: string;
  modelId: string;
  messages: ProviderMessage[];
  temperature: number;
  maxTokens?: number;
  stopSequences?: string[];
  responseFormat?: 'text' | 'json_object';
  metadata: Record<string, unknown>;
  createdAt: string;
}
