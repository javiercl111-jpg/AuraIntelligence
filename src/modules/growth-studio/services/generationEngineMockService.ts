import type {
  ExecutiveContentBrief,
  ExecutiveGenerationRequest,
  GeneratedContentDraft,
  GenerationPolicy
} from '../types';
import type { IExecutiveGenerationEngineService } from './contracts/IExecutiveGenerationEngine';
import { GenerationEngineBuilder } from './GenerationEngineBuilder';
import { ProviderResolverMock } from './ProviderResolverMock';
import { InstructionComposer } from './InstructionComposer';
import { GenerationValidator } from './GenerationValidator';
import { GeminiAdapterMock, ClaudeAdapterMock, GPTAdapterMock } from './AIProviderAdaptersMock';

export class GenerationEngineMockService implements IExecutiveGenerationEngineService {
  private builder: GenerationEngineBuilder;
  private providerResolver: ProviderResolverMock;
  private composer: InstructionComposer;
  private validator: GenerationValidator;

  constructor() {
    this.builder = new GenerationEngineBuilder();

    const adapters = [
      new GeminiAdapterMock(),
      new ClaudeAdapterMock(),
      new GPTAdapterMock()
    ];
    this.providerResolver = new ProviderResolverMock(adapters);

    this.composer = new InstructionComposer();
    this.validator = new GenerationValidator();
  }

  public buildRequest(brief: ExecutiveContentBrief, policy: GenerationPolicy): ExecutiveGenerationRequest {
    return this.builder.buildRequest(brief, policy);
  }

  public async executeGeneration(request: ExecutiveGenerationRequest, brief: ExecutiveContentBrief): Promise<GeneratedContentDraft> {
    const startTime = Date.now();

    // 1. Resolve Provider based on Policy
    const adapter = this.providerResolver.resolve(request.policy);

    // 2. Compose Instructions (Prompt Isolation)
    // The adapter knows nothing about Aura's business logic, only the ProviderInstruction
    const instruction = this.composer.compose(request, adapter.providerId, 'auto-selected-model');

    // 3. Execute Generation
    const preparedPayload = await adapter.prepare(instruction);
    const rawResponse = await adapter.generate(preparedPayload);
    const providerResponse = adapter.normalize(rawResponse);

    // 4. Validate Response (Zero Trust)
    const validationReport = this.validator.validate(request, providerResponse);

    // 5. Build Trace (Explainable Generation)
    const traces = brief ? this.builder.buildTrace(brief) : [];

    const draftId = `draft_${Date.now()}`;

    traces.forEach(t => t.draftId = draftId);

    // 6. Construct Draft
    const draft: GeneratedContentDraft = {
      id: draftId,
      briefId: request.briefId,
      generationRequestId: request.id,
      provider: adapter.providerId,
      model: (providerResponse.metadata.model as string) || 'unknown',
      providerVersion: '1.0',
      generationVersion: 1,
      instructionVersion: 1,
      providerInstructionId: instruction.id,
      traceabilityHash: this.builder.calculateTraceabilityHash(request),
      generatedAt: new Date().toISOString(),
      generationDuration: Date.now() - startTime,
      status: validationReport.status,
      generatedContent: providerResponse.content,
      generationWarnings: validationReport.warnings,
      generationValidation: validationReport,
      generationTrace: traces,
      schemaVersion: '1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return draft;
  }
}

export const generationEngineMockService = new GenerationEngineMockService();
