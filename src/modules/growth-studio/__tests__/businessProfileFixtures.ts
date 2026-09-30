import type { AuraRuntimeContext } from '../../../types/auraContext';
import type { BusinessProfile, BusinessKnowledgeField } from '../types/businessProfile';

export const TEST_RUNTIME: AuraRuntimeContext = {
  tenantId: 'tenant-a', companyId: 'company-a', userId: 'user-a',
  system: 'aura_intelligence', language: 'es', source: 'system',
  createdAt: '2026-09-29T00:00:00.000Z',
};

const field = <T>(value: T): BusinessKnowledgeField<T> => ({
  value, status: 'confirmed', confidence: 100, evidenceIds: ['explicit-test-fixture'],
});

export function knownBusinessProfile(
  scope = { tenantId: 'tenant-a', companyId: 'company-a', userId: 'user-a' },
): BusinessProfile {
  return {
    id: 'business-a', tenantId: scope.tenantId, companyId: scope.companyId,
    person: { userId: scope.userId, name: field('Javier'), role: field('Director') },
    companyName: field('Aura Nexus'), businessDescription: field('Software empresarial'),
    customersOrMarkets: field('Empresas latinoamericanas'),
    products: ['Aura HCM', 'Aura Intelligence', 'Aura Growth', 'producto'].map((name, index) => ({
      id: `product-${index}`, tenantId: scope.tenantId, companyId: scope.companyId,
      name: field(name), description: field(`Software ${name}`),
      targetCustomers: field(['Empresas']), status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    })),
  };
}
