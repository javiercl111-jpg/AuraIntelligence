import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { knownBusinessProfile, TEST_RUNTIME } from './businessProfileFixtures';
import { GrowthConversationMockService, setMockResponseDelay } from '../services/growthConversationMockService';
import { GrowthConversationProductionService } from '../services/growthConversationProductionService';

const firebaseState = vi.hoisted(() => ({
  currentUser: { getIdToken: vi.fn().mockResolvedValue('test-token') },
}));
vi.mock('../../../firebase', () => ({ auth: firebaseState }));

type Service = GrowthConversationMockService | GrowthConversationProductionService;
const scope = {
  tenantId: TEST_RUNTIME.tenantId, companyId: TEST_RUNTIME.companyId, userId: TEST_RUNTIME.userId,
};

async function answer(service: Service, id: string, content: string) {
  await service.addTurn({ conversationId: id, role: 'user', content });
  const turn = await service.generateAssistantResponse(id);
  const state = (await service.getConversation(id))!;
  return { state, turn, profile: (await service.getBusinessProfile(id))! };
}

describe.each([
  ['Mock', () => new GrowthConversationMockService()],
  ['Production', () => new GrowthConversationProductionService()],
] as const)('%s business profile onboarding', (_name, createService) => {
  let service: Service;
  beforeEach(() => {
    service = createService();
    setMockResponseDelay(0);
    vi.stubEnv('VITE_GROWTH_ADVISOR_BRIDGE_URL', 'https://bridge.example.test/growth');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true, conversationProposal: { nextQuestion: 'Valid bridge question' } }),
    }));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('CASE 1: first use asks about the person before business and campaign context', async () => {
    const conv = await service.startConversation(scope);
    expect(conv).toMatchObject({ ...scope, currentStage: 'understanding_business_profile', structuredContext: {} });
    const turns = await service.getConversationTurns(conv.id);
    expect(turns[0].content).toContain('¿Cuál es tu nombre?');
    expect(turns[0].content).not.toContain('qué producto');
    expect(turns[0].content).toContain('no se guardan para futuras conversaciones');

    expect((await answer(service, conv.id, 'Javier')).turn.content).toContain('función');
    expect((await answer(service, conv.id, 'Director')).turn.content).toContain('llama tu empresa');
    expect((await answer(service, conv.id, 'Aura Nexus')).turn.content).toContain('dedica tu empresa');
    expect((await answer(service, conv.id, 'Software')).state.currentStage).toBe('understanding_catalog');
    const candidate = await answer(service, conv.id, 'Aura HCM, Aura Growth');
    expect(candidate.profile.products).toHaveLength(0);
    expect(candidate.state.currentStage).toBe('confirming_knowledge_update');
    const accepted = await answer(service, conv.id, 'Sí');
    expect(accepted.profile.products).toHaveLength(2);
    expect(accepted.turn.content).toContain('clientes o mercados');
    expect((await answer(service, conv.id, 'Pymes')).state.currentStage).toBe('selecting_growth_scope');
  });

  it('CASE 2/3: reuses known company/catalog and asks only a missing person role', async () => {
    const profile = knownBusinessProfile();
    profile.person.role = undefined;
    const conv = await service.startConversation({ ...scope, businessProfile: profile });
    const initial = (await service.getConversationTurns(conv.id))[0].content;
    expect(initial).toContain('función');
    expect(initial).not.toMatch(/Cuál es tu nombre|dedica tu empresa|Qué productos/);
    const result = await answer(service, conv.id, 'Director');
    expect(result.state.currentStage).toBe('selecting_growth_scope');
    expect(result.turn.content).toContain('Aura HCM, Aura Intelligence, Aura Growth');
  });

  it('CASE 4/6/7: selects known product without reasking description; campaign audience is independent', async () => {
    const input = knownBusinessProfile();
    const conv = await service.startConversation({ ...scope, businessProfile: input });
    expect(conv.currentStage).toBe('selecting_growth_scope');
    const selected = await answer(service, conv.id, 'Quiero vender Aura HCM');
    expect(selected.state.structuredContext).toEqual({
      selectedProductId: 'product-0', growthScope: 'product', productOrService: 'Aura HCM',
    });
    expect(selected.turn.content).toContain('audiencia objetivo');
    const campaign = await answer(service, conv.id, 'Hoteles de 100 empleados');
    expect(campaign.state.structuredContext.audience).toBe('Hoteles de 100 empleados');
    expect(campaign.profile.products[0].targetCustomers?.value).toEqual(['Empresas']);
    expect(campaign.profile).toEqual(input);
  });

  it('CASE 5: creates only after explicit authorization and minimal description', async () => {
    const input = knownBusinessProfile();
    const conv = await service.startConversation({ ...scope, businessProfile: input });
    const proposed = await answer(service, conv.id, 'Quiero lanzar Aura Payroll');
    expect(proposed.turn.content).toContain('todavía no está registrado');
    expect(proposed.profile.products).toHaveLength(4);
    expect((await answer(service, conv.id, 'quizás sí')).profile.products).toHaveLength(4);
    const authorized = await answer(service, conv.id, 'Sí');
    expect(authorized.state.currentStage).toBe('understanding_product_description');
    expect(authorized.profile.products).toHaveLength(4);
    const added = await answer(service, conv.id, 'Automatiza la nómina');
    expect(added.state.currentStage).toBe('understanding_audience');
    expect(added.profile.products).toHaveLength(5);
    expect(added.profile.products[4]).toMatchObject({
      name: { value: 'Aura Payroll' }, description: { value: 'Automatiza la nómina' }, status: 'active',
    });
    expect(added.profile.products[4].category).toBeUndefined();
    expect(input.products).toHaveLength(4);
  });

  it('declining or cancelling a new product never changes the catalog', async () => {
    const conv = await service.startConversation({ ...scope, businessProfile: knownBusinessProfile() });
    await answer(service, conv.id, 'nuevo: Payroll');
    const denied = await answer(service, conv.id, 'No');
    expect(denied.profile.products).toHaveLength(4);
    expect(denied.state.currentStage).toBe('selecting_growth_scope');
    await answer(service, conv.id, 'nuevo: Payroll');
    await answer(service, conv.id, 'Sí');
    const cancelled = await answer(service, conv.id, 'No');
    expect(cancelled.profile.products).toHaveLength(4);
    expect(cancelled.state.structuredContext.selectedProductId).toBeUndefined();
  });

  it('updates existing description only after confirmation and preserves identity/optional fields', async () => {
    const input = knownBusinessProfile();
    const conv = await service.startConversation({ ...scope, businessProfile: input });
    await answer(service, conv.id, 'actualizar: Aura HCM');
    const candidate = await answer(service, conv.id, 'Ahora incluye nómina');
    expect(candidate.profile).toEqual(input);
    expect(candidate.state.currentStage).toBe('confirming_knowledge_update');
    const denied = await answer(service, conv.id, 'No');
    expect(denied.profile).toEqual(input);
    await answer(service, conv.id, 'actualizar: Aura HCM');
    await answer(service, conv.id, 'Ahora incluye nómina');
    const accepted = await answer(service, conv.id, 'Sí');
    expect(accepted.profile.products[0]).toMatchObject({
      id: 'product-0', createdAt: input.products[0].createdAt,
      description: { value: 'Ahora incluye nómina' },
      targetCustomers: { value: ['Empresas'] },
    });
    expect(accepted.state.structuredContext.selectedProductId).toBe('product-0');
    expect(input.products[0].description?.value).toBe('Software Aura HCM');
  });

  it('confirms only relevant stale data, preserving unrelated optional knowledge', async () => {
    const profile = knownBusinessProfile();
    profile.products[0].description!.freshness = 'STALE';
    profile.products[1].description!.freshness = 'STALE';
    const conv = await service.startConversation({ ...scope, businessProfile: profile });
    const selected = await answer(service, conv.id, 'Aura HCM');
    expect(selected.turn.content).toContain('Confirma con «sí»');
    const confirmed = await answer(service, conv.id, 'Sí');
    expect(confirmed.state.currentStage).toBe('understanding_audience');
    expect(confirmed.profile.products[0].description?.freshness).toBe('KNOWN');
    expect(confirmed.profile.products[1].description?.freshness).toBe('STALE');
  });

  it('updates a product during campaign intake and resumes without replacing campaign context', async () => {
    const profile = knownBusinessProfile();
    const conv = await service.startConversation({ ...scope, businessProfile: profile });
    await answer(service, conv.id, 'Aura HCM');
    const campaign = await answer(service, conv.id, 'Hoteles');
    const originalContext = { ...campaign.state.structuredContext };
    await answer(service, conv.id, 'actualizar: Aura Growth');
    const candidate = await answer(service, conv.id, 'Ahora incorpora analítica');
    expect(candidate.profile.products[2].description?.value).toBe('Software Aura Growth');
    const approved = await answer(service, conv.id, 'Sí');
    expect(approved.state.currentStage).toBe('understanding_region');
    expect(approved.state.structuredContext).toEqual(originalContext);
    expect(approved.profile.products[2].description?.value).toBe('Ahora incorpora analítica');
    await answer(service, conv.id, 'actualizar: Aura HCM');
    await answer(service, conv.id, 'Otra descripción');
    const declined = await answer(service, conv.id, 'No');
    expect(declined.state.currentStage).toBe('understanding_region');
    expect(declined.profile.products[0].description).toEqual(profile.products[0].description);
  });

  it('does not mistake a confirmation for a missing product description', async () => {
    const conv = await service.startConversation({ ...scope, businessProfile: knownBusinessProfile() });
    await answer(service, conv.id, 'nuevo: Payroll');
    await answer(service, conv.id, 'Sí');
    const stillMissing = await answer(service, conv.id, 'Sí');
    expect(stillMissing.state.currentStage).toBe('understanding_product_description');
    expect(stillMissing.profile.products).toHaveLength(4);
  });

  it('stale company corrections are candidates until explicitly confirmed', async () => {
    const profile = knownBusinessProfile();
    profile.businessDescription!.freshness = 'STALE';
    const conv = await service.startConversation({ ...scope, businessProfile: profile });
    const candidate = await answer(service, conv.id, 'Consultoría empresarial');
    expect(candidate.profile.businessDescription?.value).toBe('Software empresarial');
    const approved = await answer(service, conv.id, 'Sí');
    expect(approved.profile.businessDescription?.value).toBe('Consultoría empresarial');
    expect(approved.state.currentStage).toBe('selecting_growth_scope');
  });

  it('supports general company growth without forcing a product', async () => {
    const profile = knownBusinessProfile();
    profile.products = [];
    profile.catalogReviewed = true;
    const conv = await service.startConversation({ ...scope, businessProfile: profile });
    const result = await answer(service, conv.id, 'crecimiento general');
    expect(result.state.structuredContext).toMatchObject({
      growthScope: 'company', productOrService: 'Crecimiento general de Aura Nexus',
    });
    expect(result.state.structuredContext.selectedProductId).toBeUndefined();
    expect(result.profile.products).toHaveLength(0);
    expect(result.state.currentStage).toBe('understanding_audience');
  });

  it('CASE 8: preserves the complete Growth sequence and never promotes campaign facts to the profile', async () => {
    const profile = knownBusinessProfile();
    const conv = await service.startConversation({ ...scope, businessProfile: profile });
    for (const [input, stage] of [
      ['Aura HCM', 'understanding_audience'], ['Hoteles', 'understanding_region'],
      ['México', 'understanding_result'], ['Incrementar ventas 20%', 'understanding_channels'],
      ['LinkedIn, Email', 'understanding_cta'], ['Agendar demo', 'executive_reflection'],
      ['sí, es correcto', 'executive_proposal'], ['Aprobar', 'completed'],
    ]) {
      const result = await answer(service, conv.id, input);
      expect(result.state.currentStage).toBe(stage);
      expect(result.profile).toEqual(profile);
    }
    const final = (await service.getConversation(conv.id))!;
    expect(final.status).toBe('completed');
    expect(final.structuredContext.campaignChannels).toEqual(['LinkedIn', 'Email']);
    expect(final.structuredContext.campaignCallToAction).toBe('Agendar demo');
  });

  it('CASE 10: starting again with the same identity does not pretend to load saved knowledge', async () => {
    const conv = await service.startConversation({ ...scope, businessProfile: knownBusinessProfile() });
    await answer(service, conv.id, 'nuevo: Payroll');
    await answer(service, conv.id, 'Sí');
    await answer(service, conv.id, 'Nómina');
    const next = await service.startConversation(scope);
    expect(next.currentStage).toBe('understanding_business_profile');
    expect((await service.getBusinessProfile(next.id))?.products).toEqual([]);
    const copied = (await service.getBusinessProfile(conv.id))!;
    copied.products.length = 0;
    expect((await service.getBusinessProfile(conv.id))?.products).toHaveLength(5);
  });

  it('rejects cross-tenant/company profiles and products, and never reuses another person', async () => {
    await expect(service.startConversation({
      ...scope, businessProfile: knownBusinessProfile({ ...scope, companyId: 'foreign-company' }),
    })).rejects.toThrow('BUSINESS_PROFILE_SCOPE_MISMATCH');
    const foreignProduct = knownBusinessProfile();
    foreignProduct.products[0] = { ...foreignProduct.products[0], tenantId: 'foreign-tenant' };
    await expect(service.startConversation({ ...scope, businessProfile: foreignProduct }))
      .rejects.toThrow('BUSINESS_PROFILE_SCOPE_MISMATCH');
    const otherPerson = knownBusinessProfile({ ...scope, userId: 'different-user' });
    const conv = await service.startConversation({ ...scope, businessProfile: otherPerson });
    expect((await service.getConversationTurns(conv.id))[0].content).toContain('¿Cuál es tu nombre?');
    expect((await service.getBusinessProfile(conv.id))?.companyName?.value).toBe('Aura Nexus');
  });

  it('uses a provided runtime name and still asks for the business role', async () => {
    const conv = await service.startConversation({ ...scope, userName: 'Javier' });
    expect((await service.getConversationTurns(conv.id))[0].content).toContain('¿Qué función desempeñas');
    expect((await service.getBusinessProfile(conv.id))?.person.name?.value).toBe('Javier');
  });
});

describe('Production bridge failure during knowledge confirmation', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  it('does not advance state or accept a product on bridge failure; retry succeeds', async () => {
    vi.stubEnv('VITE_GROWTH_ADVISOR_BRIDGE_URL', 'https://bridge.example.test/growth');
    const fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true, conversationProposal: { nextQuestion: 'Valid' } }),
    });
    vi.stubGlobal('fetch', fetch);
    const service = new GrowthConversationProductionService();
    const conv = await service.startConversation({ ...scope, businessProfile: knownBusinessProfile() });
    await answer(service, conv.id, 'nuevo: Payroll');
    await service.addTurn({ conversationId: conv.id, role: 'user', content: 'Sí' });
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, conversationProposal: {} }) });
    await expect(service.generateAssistantResponse(conv.id)).rejects.toThrow('GROWTH_ADVISOR_NEXT_QUESTION_MISSING');
    expect((await service.getConversation(conv.id))?.currentStage).toBe('confirming_knowledge_update');
    expect((await service.getBusinessProfile(conv.id))?.products).toHaveLength(4);
    expect((await service.getConversationTurns(conv.id)).at(-1)?.role).toBe('user');
    await service.generateAssistantResponse(conv.id);
    expect((await service.getConversation(conv.id))?.currentStage).toBe('understanding_product_description');
  });
});
