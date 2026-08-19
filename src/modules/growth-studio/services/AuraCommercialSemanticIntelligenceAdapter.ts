import type {
  CommercialSemanticAnalysisRequest,
  CommercialSemanticAnalysisResult,
  CommercialSemanticMatch,
  ICommercialSemanticIntelligence,
} from './contracts/ICommercialSemanticIntelligence';

import type {
  AuraSemanticCompletionResponse,
  IAuraSemanticCompletionPort,
} from './contracts/IAuraSemanticCompletionPort';

const ALLOWED_DIMENSIONS = new Set([
  'problem_fit',
  'capability_fit',
  'customer_fit',
  'industry_fit',
  'use_case_fit',
  'declared_interest',
  'other',
]);

export class AuraCommercialSemanticIntelligenceAdapter
implements ICommercialSemanticIntelligence {
  private readonly completion:
    IAuraSemanticCompletionPort;

  constructor(
    completion:
      IAuraSemanticCompletionPort,
  ) {
    this.completion =
      completion;
  }

  async isAvailable(): Promise<boolean> {
    return this.completion.isAvailable();
  }

  private failClosed(
    requestId: string,
    status:
      | 'invalid_response'
      | 'provider_unavailable',
    gap: string,
    response?: AuraSemanticCompletionResponse,
  ): CommercialSemanticAnalysisResult {
    return {
      status,
      matches: [],
      knowledgeGaps: [gap],
      trace: {
        requestId,
        provider: response?.provider,
        model: response?.model,
        durationMs: response?.durationMs,
        tokenUsage: response?.tokenUsage,
      },
    };
  }

  private buildSystemInstruction(): string {
    return [
      'You are Aura Commercial Semantic Intelligence.',
      'Return JSON only.',
      'Do not recommend products.',
      'Do not calculate commercial scores.',
      'Do not invent facts.',
      'Only identify semantic relationships between supplied prospect signals and supplied ProductContext knowledge.',
      'Valid dimensions: problem_fit, capability_fit, customer_fit, industry_fit, use_case_fit, declared_interest, other.',
      'semanticStrength and confidence must be integers from 0 to 100.',
    ].join(' ');
  }

  private buildPayload(
    request: CommercialSemanticAnalysisRequest,
  ): string {
    return JSON.stringify({
      requestId: request.requestId,
      tenantId: request.tenantId,
      companyId: request.companyId,

      signals: request.signals.map(
        signal => ({
          id: signal.id,
          kind: signal.kind,
          value: signal.value,
          status: signal.status,
          confidence: signal.confidence,
        }),
      ),

      products: request.products.map(
        product => ({
          id: product.id,
          name: product.name,
          category: product.category,
          description: product.description,
          problemsSolved: product.problemsSolved,
          capabilities: product.capabilities,
          idealCustomerProfiles:
            product.idealCustomerProfiles,
          targetIndustries:
            product.targetIndustries,
          useCases: product.useCases,
        }),
      ),

      expectedShape: {
        matches: [
          {
            signalId: 'string',
            productContextId: 'string',
            dimension: 'allowed dimension',
            semanticStrength: '0-100',
            confidence: '0-100',
            explanation: 'string',
          },
        ],
        knowledgeGaps: ['string'],
      },
    });
  }

  private parse(
    content: string,
  ): {
    matches: CommercialSemanticMatch[];
    knowledgeGaps: string[];
  } | null {
    try {
      const parsed =
        JSON.parse(content) as {
          matches?: unknown;
          knowledgeGaps?: unknown;
        };

      if (!Array.isArray(parsed.matches)) {
        return null;
      }

      if (!Array.isArray(parsed.knowledgeGaps)) {
        return null;
      }

      const matches:
        CommercialSemanticMatch[] = [];

      for (const raw of parsed.matches) {
        if (
          typeof raw !== 'object' ||
          raw === null
        ) {
          return null;
        }

        const item =
          raw as Record<string, unknown>;

        if (
          typeof item.signalId !== 'string' ||
          typeof item.productContextId !== 'string' ||
          typeof item.dimension !== 'string' ||
          !ALLOWED_DIMENSIONS.has(
            item.dimension,
          ) ||
          typeof item.semanticStrength !== 'number' ||
          typeof item.confidence !== 'number' ||
          typeof item.explanation !== 'string'
        ) {
          return null;
        }

        if (
          item.semanticStrength < 0 ||
          item.semanticStrength > 100 ||
          item.confidence < 0 ||
          item.confidence > 100
        ) {
          return null;
        }

        matches.push({
          signalId: item.signalId,
          productContextId:
            item.productContextId,
          dimension:
            item.dimension as CommercialSemanticMatch['dimension'],
          semanticStrength:
            Math.round(item.semanticStrength),
          confidence:
            Math.round(item.confidence),
          explanation:
            item.explanation,
        });
      }

      const knowledgeGaps =
        parsed.knowledgeGaps.filter(
          (gap): gap is string =>
            typeof gap === 'string',
        );

      return {
        matches,
        knowledgeGaps,
      };
    }
    catch {
      return null;
    }
  }

  async analyze(
    request: CommercialSemanticAnalysisRequest,
  ): Promise<CommercialSemanticAnalysisResult> {
    const available =
      await this.completion.isAvailable();

    if (!available) {
      return this.failClosed(
        request.requestId,
        'provider_unavailable',
        'Aura semantic completion is unavailable.',
      );
    }

    try {
      const response =
        await this.completion.complete({
          requestId:
            request.requestId,

          systemInstruction:
            this.buildSystemInstruction(),

          userPayload:
            this.buildPayload(request),
        });

      const parsed =
        this.parse(response.content);

      if (!parsed) {
        return this.failClosed(
          request.requestId,
          'invalid_response',
          'Semantic completion could not be validated.',
          response,
        );
      }

      return {
        status: 'valid',

        matches:
          parsed.matches,

        knowledgeGaps:
          parsed.knowledgeGaps,

        trace: {
          requestId:
            request.requestId,

          provider:
            response.provider,

          model:
            response.model,

          durationMs:
            response.durationMs,

          tokenUsage:
            response.tokenUsage,
        },
      };
    }
    catch {
      return this.failClosed(
        request.requestId,
        'invalid_response',
        'Semantic completion failed.',
      );
    }
  }
}
