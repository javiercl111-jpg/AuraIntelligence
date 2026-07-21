import type { ExecutiveGenerationRequest, ProviderInstruction, ProviderMessage, GenerationContentSection } from '../types';

export class InstructionComposer {
  /**
   * Translates an Aura-specific ExecutiveGenerationRequest into a generic
   * ProviderInstruction that AI Adapters can understand.
   * This ensures Prompt Isolation™ (prompts are composed here, not hardcoded in adapters).
   */
  public compose(request: ExecutiveGenerationRequest, providerId: string, modelId: string): ProviderInstruction {
    const systemPrompt = this.buildSystemPrompt(request);
    const userPrompt = this.buildUserPrompt(request);

    const messages: ProviderMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    return {
      id: `inst_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      requestId: request.id,
      providerId,
      modelId,
      messages,
      temperature: request.policy.temperature,
      maxTokens: request.policy.maxTokens,
      metadata: {
        composedAt: new Date().toISOString(),
        intent: request.generationIntent
      },
      createdAt: new Date().toISOString()
    };
  }

  private buildSystemPrompt(request: ExecutiveGenerationRequest): string {
    return `You are Aura Intelligence's Executive Generation Engine executing a strict enterprise task.
Intent: ${request.generationIntent}
Language: ${request.language}

Constraints:
${request.providerConstraints.map((c: string) => `- ${c}`).join('\n')}

You must adhere strictly to these constraints. Do not hallucinate or invent features.`;
  }

  private buildUserPrompt(request: ExecutiveGenerationRequest): string {
    const sections = request.contentSections.map((s: GenerationContentSection) => {
      let sectionText = `[Section: ${s.heading}]\n${s.instructions}\n`;
      if (s.requiredElements && s.requiredElements.length > 0) {
        sectionText += `Required Elements: ${s.requiredElements.join(', ')}\n`;
      }
      return sectionText;
    }).join('\n');

    return `Please generate the content based on the following structural sections:\n\n${sections}`;
  }
}
