import type { IAIProviderAdapter, ProviderResponse } from './contracts/IAIProviderAdapter';
import type { ProviderInstruction } from '../types';

export class GeminiAdapterMock implements IAIProviderAdapter {
  providerId = 'google_gemini';
  capabilities = ['text_generation', 'reasoning', 'factual_accuracy', 'context_window_large'];

  async prepare(instruction: ProviderInstruction): Promise<Record<string, unknown>> {
    return { ...instruction, _preparedFor: 'gemini' };
  }

  async generate(preparedPayload: Record<string, unknown>): Promise<unknown> {
    const isCorrupt = (preparedPayload.metadata as Record<string, unknown>)?.simulateCorrupt === true;
    if (isCorrupt) return { error: 'Simulation corrupted', text: '' };

    // Using string index or 'as any' just to mock without strict TS complains in mock
    const messages = preparedPayload.messages as Array<{role: string, content: string}>;

    return {
      text: `[Gemini Generated Content]\nSystem: ${messages.find((m) => m.role === 'system')?.content}\nUser: ${messages.find((m) => m.role === 'user')?.content}`,
      tokensUsed: 420
    };
  }

  normalize(rawResponse: unknown): ProviderResponse {
    const res = rawResponse as Record<string, unknown>;
    if (res.error) {
      return { content: '', metadata: { error: res.error }, durationMs: 150 };
    }
    return {
      content: (res.text as string) || '',
      metadata: { tokens: res.tokensUsed, model: 'gemini-1.5-pro' },
      durationMs: 450
    };
  }

  validate(response: ProviderResponse): boolean {
    return response.content.trim().length > 0;
  }

  async health(): Promise<boolean> {
    return true;
  }
}

export class ClaudeAdapterMock implements IAIProviderAdapter {
  providerId = 'anthropic_claude';
  capabilities = ['text_generation', 'creative_writing', 'reasoning'];

  async prepare(instruction: ProviderInstruction): Promise<Record<string, unknown>> {
    return { ...instruction, _preparedFor: 'claude' };
  }

  async generate(preparedPayload: Record<string, unknown>): Promise<unknown> {
    const messages = preparedPayload.messages as Array<{role: string, content: string}>;
    return {
      content: `[Claude Generated Content]\nSystem: ${messages.find((m) => m.role === 'system')?.content}\nUser: ${messages.find((m) => m.role === 'user')?.content}`,
      usage: { input_tokens: 100, output_tokens: 300 }
    };
  }

  normalize(rawResponse: unknown): ProviderResponse {
    const res = rawResponse as Record<string, unknown>;
    return {
      content: (res.content as string) || '',
      metadata: { tokens: res.usage, model: 'claude-3-opus' },
      durationMs: 500
    };
  }

  validate(response: ProviderResponse): boolean {
    return response.content.trim().length > 0;
  }

  async health(): Promise<boolean> {
    return true;
  }
}

export class GPTAdapterMock implements IAIProviderAdapter {
  providerId = 'openai_gpt';
  capabilities = ['text_generation', 'code_generation', 'structured_output'];

  async prepare(instruction: ProviderInstruction): Promise<Record<string, unknown>> {
    return { ...instruction, _preparedFor: 'gpt' };
  }

  async generate(preparedPayload: Record<string, unknown>): Promise<unknown> {
    const messages = preparedPayload.messages as Array<{role: string, content: string}>;
    return {
      choices: [{ message: { content: `[GPT Generated Content]\nSystem: ${messages.find((m) => m.role === 'system')?.content}\nUser: ${messages.find((m) => m.role === 'user')?.content}` } }],
      usage: { total_tokens: 500 }
    };
  }

  normalize(rawResponse: unknown): ProviderResponse {
    const res = rawResponse as { choices?: Array<{ message?: { content?: string } }>, usage?: unknown };
    return {
      content: res.choices?.[0]?.message?.content || '',
      metadata: { tokens: res.usage, model: 'gpt-4o' },
      durationMs: 400
    };
  }

  validate(response: ProviderResponse): boolean {
    return response.content.trim().length > 0;
  }

  async health(): Promise<boolean> {
    return true;
  }
}
