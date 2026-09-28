import type { AuraRuntimeContext } from '../../../types/auraContext';
import { resolveAuraContext } from '../../../services/auraContextEngine';
import type { BrandBrain } from '../types/brandBrain';
import type {
  EnterpriseCommercialContext,
  ProductContext,
} from '../types/growthCommercialContext';
import type { ProductKnowledgeIntake } from '../types/productKnowledgeIntake';
import { EnterpriseCommercialContextMapper } from './EnterpriseCommercialContextMapper';
import { ProductContextBuilder } from './ProductContextBuilder';
import {
  ProductContextReadiness,
  type ProductContextReadinessResult,
} from './ProductContextReadiness';
import {
  ProductKnowledgeAcquisitionPlanner,
  type ProductKnowledgeAcquisitionPlan,
} from './ProductKnowledgeAcquisitionPlanner';

export type GrowthContextScope =
  | 'company'
  | 'existing_product'
  | 'new_product';

export type GrowthContextNextAction =
  | 'resolve_company'
  | 'select_product'
  | 'acquire_product_knowledge'
  | 'start_growth_discovery';

export interface GrowthContextBootstrapInput {
  readonly runtimeContext: AuraRuntimeContext;
  readonly brandBrain?: BrandBrain | null;
  readonly productIntake?: ProductKnowledgeIntake | null;
  readonly existingProduct?: ProductContext | null;
  readonly scope?: GrowthContextScope;
}

export interface GrowthContextBootstrapResult {
  readonly runtimeContext: ReturnType<typeof resolveAuraContext>;
  readonly companyContext: EnterpriseCommercialContext | null;
  readonly productContext: ProductContext | null;
  readonly productReadiness: ProductContextReadinessResult | null;
  readonly acquisitionPlan: ProductKnowledgeAcquisitionPlan | null;
  readonly scope: GrowthContextScope;
  readonly contextSufficient: boolean;
  readonly nextAction: GrowthContextNextAction;
}

export class GrowthContextBootstrap {
  static resolve(
    input: GrowthContextBootstrapInput,
  ): GrowthContextBootstrapResult {
    const runtimeContext = resolveAuraContext({
      fallbackContext: input.runtimeContext,
    });

    const companyContext = input.brandBrain
      ? EnterpriseCommercialContextMapper.fromBrandBrain(input.brandBrain)
      : null;

    const scope =
      input.scope ??
      (input.existingProduct || input.productIntake
        ? 'existing_product'
        : 'company');

    const productContext = input.productIntake
      ? ProductContextBuilder.build(
          input.productIntake,
          input.existingProduct ?? undefined,
        )
      : input.existingProduct ?? null;

    const productReadiness = productContext
      ? ProductContextReadiness.evaluate(productContext)
      : null;

    const acquisitionPlan = productContext
      ? ProductKnowledgeAcquisitionPlanner.plan(productContext)
      : null;

    let nextAction: GrowthContextNextAction;

    if (!companyContext) {
      nextAction = 'resolve_company';
    } else if (scope === 'company') {
      nextAction = 'start_growth_discovery';
    } else if (!productContext) {
      nextAction =
        scope === 'new_product'
          ? 'acquire_product_knowledge'
          : 'select_product';
    } else if (
      productReadiness &&
      productReadiness.missingStrategyFields.length > 0
    ) {
      nextAction = 'acquire_product_knowledge';
    } else {
      nextAction = 'start_growth_discovery';
    }

    return {
      runtimeContext,
      companyContext,
      productContext,
      productReadiness,
      acquisitionPlan,
      scope,
      contextSufficient: nextAction === 'start_growth_discovery',
      nextAction,
    };
  }
}