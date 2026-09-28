import { describe, expect, it } from 'vitest';
import { GrowthContextBootstrap } from '../services/GrowthContextBootstrap';
import type { AuraRuntimeContext } from '../../../types/auraContext';

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