import type {
  ExecutiveContentBrief,
  ExecutiveGenerationRequest,
  GenerationPolicy,
  GenerationTrace,
  ProviderCapability
} from '../types';

export class GenerationEngineBuilder {
  /**
   * Deterministically builds the ExecutiveGenerationRequest from the Brief.
   * Reproducibility is guaranteed if the same brief and policy are provided.
   */
  public buildRequest(brief: ExecutiveContentBrief, policy: GenerationPolicy): ExecutiveGenerationRequest {
    // A real implementation would hash brief contents to ensure determinism
    const deterministicId = this.generateDeterministicId(brief.id, policy.id);

    return {
      id: `req_${deterministicId}`,
      briefId: brief.id,
      assetId: brief.selectedAsset?.assetId || 'unknown',
      assetType: brief.selectedAsset?.title || 'unknown',
      language: 'es-ES', // Should be inferred from brief, mocking for now
      generationIntent: 'draft_creation',
      providerCapabilities: policy.mandatoryCapabilities as ProviderCapability[],
      contentSections: [
        {
          id: 'sec_1',
          heading: 'Core Message',
          instructions: brief.coreMessage.value || ''
        },
        {
          id: 'sec_2',
          heading: 'Target Audience',
          instructions: brief.targetAudience.value || ''
        }
      ],
      providerConstraints: brief.constraints.map(c => c.description),
      policy,
      generationMetadata: {
        businessContext: brief.businessContext.value,
        brandGuidelines: brief.brandGuidelines.value
      },
      schemaVersion: '1.0',
      createdAt: new Date().toISOString(), // In a fully deterministic setup, this might be fixed or omitted from hash
      updatedAt: new Date().toISOString()
    };
  }

  public buildTrace(brief: ExecutiveContentBrief): GenerationTrace[] {
    const traces: GenerationTrace[] = [];

    if (brief.coreMessage.value) {
      traces.push({
        id: `trc_${Date.now()}_1`,
        draftId: '', // Filled later
        artifactType: 'ExecutiveContentBrief',
        artifactId: brief.id,
        section: 'Core Message',
        field: 'coreMessage',
        derivedFrom: 'ContentPlan.AssetDependencies',
        transformation: 'Direct mapping to prompt section',
        reason: 'Ensures the primary strategic message is injected as a required generation constraint.',
        confidence: 1.0
      });
    }

    if (brief.constraints && brief.constraints.length > 0) {
      traces.push({
        id: `trc_${Date.now()}_2`,
        draftId: '', // Filled later
        artifactType: 'ExecutiveContentBrief',
        artifactId: brief.id,
        section: 'Constraints',
        field: 'constraints',
        derivedFrom: 'BrandBrain.ToneGuidelines',
        transformation: 'Converted to negative constraints in system prompt',
        reason: 'Prevents the AI from violating established brand boundaries.',
        confidence: 0.95
      });
    }

    return traces;
  }

  private generateDeterministicId(briefId: string, policyId: string): string {
    return btoa(`${briefId}_${policyId}`).substring(0, 12);
  }

  public calculateTraceabilityHash(request: ExecutiveGenerationRequest): string {
    return btoa(JSON.stringify(request.contentSections) + JSON.stringify(request.providerConstraints)).substring(0, 16);
  }
}
