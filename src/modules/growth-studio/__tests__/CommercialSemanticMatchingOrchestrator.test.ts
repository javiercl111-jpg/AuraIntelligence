import { describe, expect, it } from 'vitest';

import type { ProductContext } from '../types/growthCommercialContext';
import type {
  ProductPortfolio,
  SolutionMatchingSignal,
} from '../types/solutionMatching';
import type {
  ICommercialSemanticIntelligence,
} from '../services/contracts/ICommercialSemanticIntelligence';

import {
  CommercialSemanticMatchingOrchestrator,
} from '../services/CommercialSemanticMatchingOrchestrator';

const field = <T>(value: T) => ({
  value,
  status: 'confirmed' as const,
  confidence: 100,
  evidenceIds: [],
});

const portfolio = (): ProductPortfolio => ({
  id: 'portfolio:aura',
  tenantId: 'tenant-aura',
  companyId: 'company-aura',
  entries: [
    {
      id: 'entry:hcm',
      productContext: {
        productContextId: 'product:hcm',
        version: 1,
      },
      status: 'active',
      commerciallyRecommendable: true,
    },
  ],
  version: 1,
  updatedAt: '2026-08-19T00:00:00.000Z',
});

const product = (): ProductContext => ({
  id: 'product:hcm',
  tenantId: 'tenant-aura',
  companyId: 'company-aura',

  name: field('Aura HCM'),
  category: field('HCM'),
  description: field('Human capital management platform'),
  problemsSolved: field(['Attendance management']),
  capabilities: field(['Employee management']),
  benefits: field(['Operational visibility']),
  differentiators: field(['AI-native']),
  idealCustomerProfiles: field(['Mid-market companies']),
  targetIndustries: field(['Hospitality']),
  useCases: field(['Attendance operations']),

  pricingContext: {
    value: null,
    status: 'missing',
    confidence: 0,
    evidenceIds: [],
  },

  commercialEvidence: {
    value: null,
    status: 'missing',
    confidence: 0,
    evidenceIds: [],
  },

  claimsRestrictions: field([
    'Do not guarantee outcomes',
  ]),

  preferredMessages: {
    value: null,
    status: 'missing',
    confidence: 0,
    evidenceIds: [],
  },

  websiteUrl: {
    value: null,
    status: 'missing',
    confidence: 0,
    evidenceIds: [],
  },

  evidence: [],
  status: 'draft',
  completenessScore: 75,
  version: 1,
  createdAt: '2026-08-19T00:00:00.000Z',
  updatedAt: '2026-08-19T00:00:00.000Z',
});

const signal = (
  id: string,
  kind: SolutionMatchingSignal['kind'],
): SolutionMatchingSignal => ({
  id,
  kind,
  value: id,
  status: 'confirmed',
  confidence: 95,
  sourceAuthority: 'control_center',
  sourceRef: `prospect:${id}`,
});

describe(
  'CommercialSemanticMatchingOrchestrator',
  () => {
    it('turns valid semantic evidence into a recommendation', async () => {
      const intelligence: ICommercialSemanticIntelligence = {
        async isAvailable() {
          return true;
        },

        async analyze() {
          return {
            status: 'valid',
            matches: [
              {
                signalId: 'sig:problem',
                productContextId: 'product:hcm',
                dimension: 'problem_fit',
                semanticStrength: 95,
                confidence: 90,
                explanation: 'Strong problem fit.',
              },
              {
                signalId: 'sig:capability',
                productContextId: 'product:hcm',
                dimension: 'capability_fit',
                semanticStrength: 95,
                confidence: 90,
                explanation: 'Strong capability fit.',
              },
              {
                signalId: 'sig:customer',
                productContextId: 'product:hcm',
                dimension: 'customer_fit',
                semanticStrength: 95,
                confidence: 90,
                explanation: 'Strong customer fit.',
              },
            ],
            knowledgeGaps: [],
            trace: {
              requestId: 'semantic:req:1',
              provider: 'fake-provider',
              model: 'fake-model',
            },
          };
        },
      };

      const output =
        await new CommercialSemanticMatchingOrchestrator(
          intelligence,
        ).execute({
          portfolio: portfolio(),
          signals: [
            signal('sig:problem', 'business_problem'),
            signal('sig:capability', 'required_capability'),
            signal('sig:customer', 'company_size'),
          ],
          products: [product()],
          complementaryRelationships: [],
          requestId: 'semantic:req:1',
          generatedAt: '2026-08-19T04:00:00.000Z',
        });

      expect(output.semanticStatus).toBe('valid');
      expect(output.acceptedEvidenceCount).toBe(3);
      expect(output.recommendation.decision)
        .toBe('single_product');
      expect(
        output.recommendation.primaryProduct
          ?.productContextId,
      ).toBe('product:hcm');
    });

    it('rejects weak semantic evidence', async () => {
      const intelligence: ICommercialSemanticIntelligence = {
        async isAvailable() {
          return true;
        },

        async analyze() {
          return {
            status: 'valid',
            matches: [
              {
                signalId: 'sig:problem',
                productContextId: 'product:hcm',
                dimension: 'problem_fit',
                semanticStrength: 95,
                confidence: 30,
                explanation: 'Uncertain interpretation.',
              },
            ],
            knowledgeGaps: [],
            trace: {
              requestId: 'semantic:req:weak',
            },
          };
        },
      };

      const output =
        await new CommercialSemanticMatchingOrchestrator(
          intelligence,
        ).execute({
          portfolio: portfolio(),
          signals: [
            signal('sig:problem', 'business_problem'),
          ],
          products: [product()],
          complementaryRelationships: [],
          requestId: 'semantic:req:weak',
          generatedAt: '2026-08-19T04:00:00.000Z',
        });

      expect(output.acceptedEvidenceCount).toBe(0);
      expect(output.rejectedSemanticMatches).toBe(1);
      expect(output.recommendation.decision)
        .not.toBe('single_product');
    });

    it('fails closed when intelligence is unavailable', async () => {
      const intelligence: ICommercialSemanticIntelligence = {
        async isAvailable() {
          return false;
        },

        async analyze() {
          throw new Error('must not execute');
        },
      };

      const output =
        await new CommercialSemanticMatchingOrchestrator(
          intelligence,
        ).execute({
          portfolio: portfolio(),
          signals: [
            signal('sig:problem', 'business_problem'),
          ],
          products: [product()],
          complementaryRelationships: [],
          requestId: 'semantic:req:unavailable',
          generatedAt: '2026-08-19T04:00:00.000Z',
        });

      expect(output.semanticStatus)
        .toBe('provider_unavailable');
      expect(output.acceptedEvidenceCount).toBe(0);
      expect(output.recommendation.decision)
        .not.toBe('single_product');
    });

    it('fails closed on invalid semantic response', async () => {
      const intelligence: ICommercialSemanticIntelligence = {
        async isAvailable() {
          return true;
        },

        async analyze() {
          return {
            status: 'invalid_response',
            matches: [
              {
                signalId: 'sig:problem',
                productContextId: 'product:hcm',
                dimension: 'problem_fit',
                semanticStrength: 100,
                confidence: 100,
                explanation: 'Must not survive.',
              },
            ],
            knowledgeGaps: [
              'Invalid structured response.',
            ],
            trace: {
              requestId: 'semantic:req:invalid',
            },
          };
        },
      };

      const output =
        await new CommercialSemanticMatchingOrchestrator(
          intelligence,
        ).execute({
          portfolio: portfolio(),
          signals: [
            signal('sig:problem', 'business_problem'),
          ],
          products: [product()],
          complementaryRelationships: [],
          requestId: 'semantic:req:invalid',
          generatedAt: '2026-08-19T04:00:00.000Z',
        });

      expect(output.semanticStatus)
        .toBe('invalid_response');

      expect(output.acceptedEvidenceCount)
        .toBe(0);

      expect(output.semanticKnowledgeGaps)
        .toContain(
          'Invalid structured response.',
        );
    });
  },
);
