import type {
  ExecutiveContentBrief,
  ExecutiveGenerationRequest,
  GeneratedContentDraft,
  GenerationPolicy
} from '../../types';

export interface IExecutiveGenerationEngineService {
  /**
   * Generates a deterministic ExecutiveGenerationRequest from a Brief and Policy
   */
  buildRequest(brief: ExecutiveContentBrief, policy: GenerationPolicy): ExecutiveGenerationRequest;

  /**
   * Executes the full generation flow: translates the request to provider instructions,
   * invokes the appropriate adapter, and validates the response, returning a Draft.
   */
  executeGeneration(request: ExecutiveGenerationRequest, brief?: ExecutiveContentBrief): Promise<GeneratedContentDraft>;
}
