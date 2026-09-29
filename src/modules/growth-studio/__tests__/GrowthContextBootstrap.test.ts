import { describe, expect, it, vi } from 'vitest';
import { GrowthContextBootstrap } from '../services/GrowthContextBootstrap';
import type { AuraRuntimeContext } from '../../../types/auraContext';
import type { CommercialKnowledgeField, EnterpriseCommercialContext, ProductContext } from '../types/growthCommercialContext';
import { knownBusinessProfile } from './businessProfileFixtures';
import { nextBusinessQuestion } from '../services/businessProfileOnboarding';

const runtimeContext: AuraRuntimeContext = {
  tenantId: 'tenant-1',
  companyId: 'company-1',
  userId: 'user-1',
  system: 'aura_intelligence',
  language: 'es',
  source: 'system',
  permissions: [],
  createdAt: '2026-09-25T00:00:00.000Z',
};

describe('GrowthContextBootstrap', () => {
  it('preserves authenticated runtime identity and requests company context when it is missing', () => {
    const result = GrowthContextBootstrap.resolve({
      runtimeContext,
      scope: 'company',
    });

    expect(result.runtimeContext.tenantId).toBe('tenant-1');
    expect(result.runtimeContext.companyId).toBe('company-1');
    expect(result.runtimeContext.userId).toBe('user-1');
    expect(result.companyContext).toBeNull();
    expect(result.nextAction).toBe('resolve_company');
    expect(result.contextSufficient).toBe(false);
  });

  it('does not fabricate product knowledge', () => {
    const result = GrowthContextBootstrap.resolve({
      runtimeContext,
      scope: 'new_product',
    });

    expect(result.productContext).toBeNull();
    expect(result.productReadiness).toBeNull();
    expect(result.acquisitionPlan).toBeNull();
  });
});

const known = <T>(value: T): CommercialKnowledgeField<T> => ({
  value, status: 'confirmed', confidence: 100, evidenceIds: [],
});
function enterprise(): EnterpriseCommercialContext {
  return {
    id: 'enterprise-1', companyId: 'company-1', tenantId: 'tenant-z',
    companyName: known('Persisted company'), businessDescription: known('Persisted business'),
    industry: known('Software'), valueProposition: known('Value'), differentiators: known(['Integrated']),
    targetMarkets: known(['Mexico']), brandTone: known('Professional'), communicationStyle: known('Direct'),
    businessGoals: known(['Growth']), evidence: [], status: 'active', completenessScore: 100,
    version: 1, createdAt: '2020-01-01T00:00:00Z', updatedAt: '2020-01-01T00:00:00Z',
  };
}
function product(): ProductContext {
  return {
    ...enterprise(), id: 'product-1', tenantId: 'product-tenant', name: known('Saved product'),
    description: known('Saved description'), category: known('SaaS'), problemsSolved: known(['Work']),
    capabilities: known(['Automation']), benefits: known(['Time']), idealCustomerProfiles: known(['Companies']),
    targetIndustries: known(['Software']), useCases: known(['Operations']), pricingContext: known('Subscription'),
    commercialEvidence: known(['Reference']), claimsRestrictions: known(['No guarantee']),
    preferredMessages: known(['Hello']), websiteUrl: known('https://example.test'),
  };
}
function repository(company: EnterpriseCommercialContext | null = enterprise(), products = [product()]) {
  return {
    readEnterpriseContext: vi.fn().mockResolvedValue(company),
    readProductContexts: vi.fn().mockResolvedValue(products),
    createEnterpriseContext: vi.fn(), updateEnterpriseContext: vi.fn(),
    createProductContext: vi.fn(), updateProductContext: vi.fn(),
  };
}

describe('Read-only commercial hydration', () => {
  it('reads only company scope, skips known company/catalog questions and never writes', async () => {
    const repo = repository();
    const session = knownBusinessProfile(runtimeContext);
    session.companyName = undefined;
    session.businessDescription = undefined;
    session.products = [];
    const result = await GrowthContextBootstrap.hydrate({ runtimeContext, repository: repo, businessProfile: session });
    expect(repo.readEnterpriseContext).toHaveBeenCalledWith({ companyId: 'company-1' });
    expect(repo.readProductContexts).toHaveBeenCalledWith({ companyId: 'company-1' });
    expect(result.runtimeContext).toMatchObject({ userId: 'user-1', companyId: 'company-1', tenantId: 'tenant-1' });
    expect(result.businessProfile.companyName?.value).toBe('Persisted company');
    expect(result.businessProfile.products[0]).toMatchObject({ tenantId: 'product-tenant', name: { value: 'Saved product' } });
    expect(result.businessProfile.companyName).not.toHaveProperty('freshness'); // No age-based staleness.
    expect(nextBusinessQuestion({ profile: result.businessProfile }).stage).toBe('selecting_growth_scope');
    expect(session.companyName).toBeUndefined();
    expect(session.products).toEqual([]);
    for (const write of [repo.createEnterpriseContext, repo.updateEnterpriseContext, repo.createProductContext, repo.updateProductContext]) {
      expect(write).not.toHaveBeenCalled();
    }
  });

  it('missing enterprise and catalog produce normal onboarding, not placeholder entities', async () => {
    const result = await GrowthContextBootstrap.hydrate({ runtimeContext, repository: repository(null, []) });
    expect(result.businessProfile.companyName).toBeUndefined();
    expect(result.businessProfile.products).toEqual([]);
    expect(result.businessProfile.catalogReviewed).toBeUndefined();
    expect(result.businessProfile.customersOrMarkets).toBeUndefined();
    expect(nextBusinessQuestion({ profile: result.businessProfile }).content).toContain('¿Cuál es tu nombre?');
  });

  it('retains a product-only snapshot without fabricating company knowledge', async () => {
    const result = await GrowthContextBootstrap.hydrate({ runtimeContext, repository: repository(null) });
    expect(result.businessProfile.products).toHaveLength(1);
    expect(result.businessProfile.companyName).toBeUndefined();
  });

  it.each(['readEnterpriseContext', 'readProductContexts'] as const)('propagates %s errors without a fallback view', async method => {
    const repo = repository();
    repo[method].mockRejectedValue(new Error('permission-denied'));
    await expect(GrowthContextBootstrap.hydrate({ runtimeContext, repository: repo })).rejects.toThrow('permission-denied');
  });

  it('keeps unknown vs reviewed-empty catalog and person separate from canonical fields', async () => {
    const session = knownBusinessProfile(runtimeContext);
    session.products = [];
    session.catalogReviewed = true;
    const result = await GrowthContextBootstrap.hydrate({ runtimeContext, repository: repository(enterprise(), []), businessProfile: session });
    expect(result.businessProfile.catalogReviewed).toBe(true);
    expect(result.businessProfile.person).toEqual(session.person);
    expect(result.businessProfile.customersOrMarkets).toEqual(session.customersOrMarkets);
    const noSession = await GrowthContextBootstrap.hydrate({ runtimeContext, repository: repository(enterprise(), []) });
    expect(noSession.businessProfile.catalogReviewed).toBeUndefined();
    expect(noSession.businessProfile.customersOrMarkets).toBeUndefined();
    expect(noSession.businessProfile.person.role).toBeUndefined();
  });

  it('rejects foreign company snapshots and an unresolved identity', async () => {
    await expect(GrowthContextBootstrap.hydrate({ runtimeContext,
      repository: repository({ ...enterprise(), companyId: 'other' }),
    })).rejects.toThrow('company mismatch');
    const repo = repository();
    await expect(GrowthContextBootstrap.hydrate({ runtimeContext: { ...runtimeContext, userId: '' }, repository: repo }))
      .rejects.toThrow('authenticated user and company');
    expect(repo.readEnterpriseContext).not.toHaveBeenCalled();
  });
});
