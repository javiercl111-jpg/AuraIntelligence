// GSTACK-AURA-AUTH-REMEDIATION-R3: exercise real operational lists with mocked Firestore.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AuraAskRequest, AuraSystem } from '../../types/auraIntelligence';
import type { AuraHCMConnectorContext } from '../../types/auraHCMConnector';

type Constraint = { __type: string; field?: string; op?: string; value?: unknown; n?: number };
type QueryRef = { __name: string; constraints: Constraint[] };
const state = vi.hoisted(() => ({
  context: null as AuraHCMConnectorContext | null,
  source: 'hcm',
  getDocs: vi.fn(async (_ref: QueryRef) => ({ docs: [] })),
}));

vi.mock('../../firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ __name: name }),
  where: (field: string, op: string, value: unknown) => ({ __type: 'where', field, op, value }),
  limit: (n: number) => ({ __type: 'limit', n }),
  query: (ref: { __name: string }, ...constraints: Constraint[]) => ({ ...ref, constraints }),
  getDocs: (ref: QueryRef) => state.getDocs(ref),
}));
vi.mock('../auraHCMConnectorService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../auraHCMConnectorService')>();
  return { ...actual, buildAuraHCMConnectorContext: vi.fn(async () => state.context) };
});
vi.mock('../auraMaintenanceConnectorService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../auraMaintenanceConnectorService')>();
  return { ...actual, buildAuraMaintenanceConnectorContext: vi.fn(actual.buildAuraMaintenanceConnectorContext) };
});
vi.mock('../auraSignatureConnectorService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../auraSignatureConnectorService')>();
  return { ...actual, buildAuraSignatureConnectorContext: vi.fn(actual.buildAuraSignatureConnectorContext) };
});
vi.mock('../../modules/operational-intelligence/services/auraOperationalIntelligenceService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../modules/operational-intelligence/services/auraOperationalIntelligenceService')>();
  return { ...actual, default: vi.fn(actual.default) };
});
vi.mock('../auraKnowledgeService', () => ({ searchKnowledgeArticles: vi.fn().mockResolvedValue([]) }));
vi.mock('../auraConversationService', () => ({ saveAuraConversationAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../auraIntentEngine', () => ({
  detectAuraIntent: vi.fn(() => ({ system: 'unknown', moduleId: null })),
}));
vi.mock('../auraOperationalIntentEngine', () => ({
  detectAuraOperationalIntent: vi.fn(() => ({ source: state.source })),
}));
vi.mock('../auraResponseEngine', () => ({
  buildAuraResponse: vi.fn(() => ({
    answer: 'Knowledge-only response', matchedArticles: [], confidenceLabel: 'low', confidenceScore: 0,
    sources: [], relatedArticles: [], suggestedActions: [], preparedAction: null,
  })),
}));
vi.mock('../auraActionEngine', () => ({ suggestAuraActions: vi.fn(() => []) }));
vi.mock('../auraAIGateway', () => ({ generateAuraAIAnswer: vi.fn() }));
vi.mock('../auraUsageEngine', () => ({
  estimateAuraCostUsd: vi.fn(() => 0),
  estimateAuraTokenUsage: vi.fn(() => 0),
  getDefaultAuraUsageLimits: vi.fn(() => ({ aiEnabled: false })),
  validateAuraUsage: vi.fn(() => ({ allowed: false, mode: 'knowledge_only' })),
}));
vi.mock('../auraPreparedActionResolver', () => ({ resolveAuraPreparedAction: vi.fn(() => null) }));

import { askAuraIntelligence } from '../auraIntelligenceEngine';
import { buildAuraHCMConnectorContext } from '../auraHCMConnectorService';
import { buildAuraMaintenanceConnectorContext } from '../auraMaintenanceConnectorService';
import { buildAuraSignatureConnectorContext } from '../auraSignatureConnectorService';
import operationalRead from '../../modules/operational-intelligence/services/auraOperationalIntelligenceService';
import { saveAuraConversationAudit } from '../auraConversationService';
import { generateAuraAIAnswer } from '../auraAIGateway';

const employeeId = ' emp-persisted ';
const companyId = ' company-persisted ';
const trustedContext = (role = 'EMPLOYEE'): AuraHCMConnectorContext => ({
  identityResolved: true,
  employee: { employeeId, companyId, role, profileId: 'persisted-profile' },
  profile: { profileId: 'persisted-profile', role, permissions: [] },
  company: { companyId },
  permissions: { role, permissions: [], canViewReports: false },
});
const requestFor = (system: AuraSystem, question: string): AuraAskRequest => ({
  question,
  context: {
    tenantId: 'client-tenant', companyId: 'client-company', userId: 'client-user',
    userEmail: 'employee@aura.demo', role: 'SUPER_ADMIN', profileId: 'client-admin-profile',
    permissions: ['payroll.manage', 'reports.view', 'aura_intelligence:admin'],
    system, language: 'es',
  },
});
const routes: { source: string; system: AuraSystem; question: string }[] = [
  { source: 'hcm', system: 'aura_hcm', question: 'vacaciones pendientes' },
  { source: 'signature', system: 'aura_signature', question: 'documentos pendientes de firma' },
  { source: 'maintenance', system: 'aura_maintenance', question: 'ordenes abiertas' },
];
const assertNoSummaries = () => {
  expect(buildAuraMaintenanceConnectorContext).not.toHaveBeenCalled();
  expect(buildAuraSignatureConnectorContext).not.toHaveBeenCalled();
};
const assertCompleted = (request: AuraAskRequest) => {
  // A catch/fallback before authorization checks cannot satisfy the test.
  expect(buildAuraHCMConnectorContext).toHaveBeenCalledExactlyOnceWith({ userEmail: request.context.userEmail });
  expect(saveAuraConversationAudit).toHaveBeenCalledTimes(1);
  expect(saveAuraConversationAudit).toHaveBeenCalledWith(expect.objectContaining({
    system: request.context.system,
    metadata: expect.objectContaining({
      maintenanceContext: null, maintenanceAnswer: null,
      signatureContext: null, signatureAnswer: null,
    }),
  }));
  expect(generateAuraAIAnswer).not.toHaveBeenCalled();
  assertNoSummaries();
};

beforeEach(() => {
  vi.clearAllMocks();
  state.context = trustedContext();
  state.source = 'hcm';
});

for (const route of routes) {
  for (const routing of ['intent', 'context'] as const) {
    describe(`${route.system} via ${routing}`, () => {
      beforeEach(() => { state.source = routing === 'intent' ? route.source : 'unknown'; });

      it('unresolved identity causes zero protected calls and zero Firestore reads', async () => {
        state.context = { identityResolved: false, employee: null, profile: null, company: null, permissions: { permissions: [] } };
        const request = requestFor(route.system, route.question);
        expect((await askAuraIntelligence(request)).answer).toBe('Knowledge-only response');
        expect(operationalRead).not.toHaveBeenCalled();
        expect(state.getDocs).not.toHaveBeenCalled();
        assertCompleted(request);
      });

      it('requires identityResolved to be true even with populated persisted-looking fields', async () => {
        state.context = { ...trustedContext('SUPER_ADMIN'), identityResolved: false };
        const request = requestFor(route.system, route.question);
        await askAuraIntelligence(request);
        expect(operationalRead).not.toHaveBeenCalled();
        expect(state.getDocs).not.toHaveBeenCalled();
        assertCompleted(request);
      });

      for (const field of ['employeeId', 'companyId'] as const) {
        it.each([undefined, '', ' \t\n '])(`denies an incomplete persisted ${field}`, async (value) => {
          const context = trustedContext('HR_MANAGER');
          state.context = { ...context, employee: { ...context.employee, [field]: value } };
          const request = requestFor(route.system, route.question);
          await askAuraIntelligence(request);
          expect(operationalRead).not.toHaveBeenCalled();
          expect(state.getDocs).not.toHaveBeenCalled();
          assertCompleted(request);
        });
      }

      it.each(['EMPLOYEE', 'HR_MANAGER', 'SUPER_ADMIN'])('keeps summaries denied for persisted %s while forwarding exact list scope', async (role) => {
        state.context = trustedContext(role);
        // Even persisted reports access is not authorization for these summaries.
        state.context.permissions = { role, permissions: ['reports.view'], canViewReports: true };
        const request = requestFor(route.system, route.question);
        const response = await askAuraIntelligence(request);
        expect(operationalRead).toHaveBeenCalledExactlyOnceWith({ question: route.question, employeeId, companyId, role });
        if (route.source === 'hcm') {
          expect(state.getDocs).toHaveBeenCalledTimes(1);
          expect(response.answer).toBe('No hay solicitudes de vacaciones pendientes de aprobación.');
        } else {
          expect(state.getDocs).not.toHaveBeenCalled();
          expect(response.answer).toBe('Knowledge-only response');
        }
        assertCompleted(request);
      });
    });
  }
}

for (const { source, system, question, path } of [
  { source: 'hcm', system: 'aura_hcm', question: 'vacaciones pendientes', path: 'vacation_requests' },
  { source: 'signature', system: 'aura_signature', question: 'firmas pendientes', path: `companies/${companyId}/signatureDocuments` },
] as const) {
  it.each(['EMPLOYEE', 'HR_MANAGER'])(`${system} positive LIST control for %s uses exact persisted scope`, async (role) => {
    state.source = source;
    state.context = trustedContext(role);
    const request = requestFor(system, question);
    await askAuraIntelligence(request);
    expect(operationalRead).toHaveBeenCalledExactlyOnceWith({ question, employeeId, companyId, role });
    expect(state.getDocs).toHaveBeenCalledTimes(1);
    const [ref] = state.getDocs.mock.calls[0];
    expect(ref.__name).toBe(path);
    expect(ref.constraints.filter((c) => c.field === 'employeeId')).toEqual(
      role === 'EMPLOYEE' ? [{ __type: 'where', field: 'employeeId', op: '==', value: employeeId }] : []
    );
    expect(ref.constraints.filter((c) => c.field === 'companyId')).toEqual(
      source === 'hcm' ? [{ __type: 'where', field: 'companyId', op: '==', value: companyId }] : []
    );
    expect(saveAuraConversationAudit).toHaveBeenCalledWith(expect.objectContaining({
      companyId,
      metadata: expect.objectContaining({
        hcmPermissions: expect.objectContaining({ permissions: [] }),
        hcmProfile: expect.objectContaining({ profileId: 'persisted-profile' }),
      }),
    }));
    assertCompleted(request);
  });
}
