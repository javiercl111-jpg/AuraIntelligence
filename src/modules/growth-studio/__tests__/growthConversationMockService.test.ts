import { describe, it, expect, beforeEach } from 'vitest';
import { 
  growthConversationService, 
  setMockResponseDelay 
} from '../services/growthConversationMockService';

describe('GrowthConversationMockService', () => {
  beforeEach(() => {
    setMockResponseDelay(0); // Zero delay for tests
  });

  it('starts a conversation in welcome state', async () => {
    const conv = await growthConversationService.startConversation({
      tenantId: 'growth_demo_tenant',
      companyId: 'growth_demo_company',
      userId: 'growth_demo_user'
    });

    expect(conv.status).toBe('active');
    expect(conv.currentStage).toBe('understanding_objective');
    expect(conv.tenantId).toBe('growth_demo_tenant');

    const turns = await growthConversationService.getConversationTurns(conv.id);
    expect(turns.length).toBe(1);
    expect(turns[0].role).toBe('assistant');
  });

  it('progresses through the full state machine via happy path', async () => {
    const conv = await growthConversationService.startConversation({
      tenantId: 'test', companyId: 'test', userId: 'test'
    });

    // 1. Send Objective with Product -> expect Audience question (skipping product question)
    await growthConversationService.addTurn({ conversationId: conv.id, role: 'user', content: 'Quiero vender Aura HCM' });
    await growthConversationService.generateAssistantResponse(conv.id);
    let updatedConv = await growthConversationService.getConversation(conv.id);
    expect(updatedConv?.currentStage).toBe('understanding_audience');
    expect(updatedConv?.structuredContext.objective).toBe('vender/comercializar');
    expect(updatedConv?.structuredContext.productOrService).toBe('Aura HCM');

    // 2. Send Audience -> expect Region question
    await growthConversationService.addTurn({ conversationId: conv.id, role: 'user', content: 'My audience' });
    await growthConversationService.generateAssistantResponse(conv.id);
    updatedConv = await growthConversationService.getConversation(conv.id);
    expect(updatedConv?.currentStage).toBe('understanding_region');

    // 3. Send Region -> expect Result question
    await growthConversationService.addTurn({ conversationId: conv.id, role: 'user', content: 'My region' });
    await growthConversationService.generateAssistantResponse(conv.id);
    updatedConv = await growthConversationService.getConversation(conv.id);
    expect(updatedConv?.currentStage).toBe('understanding_result');

    // 4. Send Result -> expect Reflection
    await growthConversationService.addTurn({ conversationId: conv.id, role: 'user', content: 'My result' });
    await growthConversationService.generateAssistantResponse(conv.id);
    updatedConv = await growthConversationService.getConversation(conv.id);
    expect(updatedConv?.currentStage).toBe('executive_reflection');

    // 5. Send Confirmation directly -> expect Proposal
    await growthConversationService.addTurn({ conversationId: conv.id, role: 'user', content: 'Sí, es correcto' });
    await growthConversationService.generateAssistantResponse(conv.id);
    updatedConv = await growthConversationService.getConversation(conv.id);
    expect(updatedConv?.currentStage).toBe('executive_proposal');

    // 6. Send Final Approval -> expect Completed
    await growthConversationService.addTurn({ conversationId: conv.id, role: 'user', content: 'Aprobar' });
    await growthConversationService.generateAssistantResponse(conv.id);
    updatedConv = await growthConversationService.getConversation(conv.id);
    expect(updatedConv?.currentStage).toBe('completed');
    expect(updatedConv?.status).toBe('completed');
  });

  it('asks for product if not identified in objective', async () => {
    const conv = await growthConversationService.startConversation({
      tenantId: 'test', companyId: 'test', userId: 'test'
    });

    // 1. Send Objective without Product -> expect Product question
    await growthConversationService.addTurn({ conversationId: conv.id, role: 'user', content: 'Quiero crecer este año' });
    await growthConversationService.generateAssistantResponse(conv.id);
    let updatedConv = await growthConversationService.getConversation(conv.id);
    expect(updatedConv?.currentStage).toBe('understanding_product');

    // 2. Send Product -> expect Audience question
    await growthConversationService.addTurn({ conversationId: conv.id, role: 'user', content: 'Aura HCM' });
    await growthConversationService.generateAssistantResponse(conv.id);
    updatedConv = await growthConversationService.getConversation(conv.id);
    expect(updatedConv?.currentStage).toBe('understanding_audience');
    expect(updatedConv?.structuredContext.productOrService).toBe('Aura HCM');
  });

  it('handles correction flow in executive_reflection', async () => {
    const conv = await growthConversationService.startConversation({
      tenantId: 'test', companyId: 'test', userId: 'test'
    });

    // Fast-forward to reflection
    await growthConversationService.addTurn({ conversationId: conv.id, role: 'user', content: 'Quiero vender Aura HCM' });
    await growthConversationService.generateAssistantResponse(conv.id);
    await growthConversationService.addTurn({ conversationId: conv.id, role: 'user', content: 'My audience' });
    await growthConversationService.generateAssistantResponse(conv.id);
    await growthConversationService.addTurn({ conversationId: conv.id, role: 'user', content: 'My region' });
    await growthConversationService.generateAssistantResponse(conv.id);
    await growthConversationService.addTurn({ conversationId: conv.id, role: 'user', content: 'My result' });
    await growthConversationService.generateAssistantResponse(conv.id);
    let updatedConv = await growthConversationService.getConversation(conv.id);
    expect(updatedConv?.currentStage).toBe('executive_reflection');

    // User corrects audience
    await growthConversationService.addTurn({ conversationId: conv.id, role: 'user', content: 'cambiar audiencia a Pymes' });
    await growthConversationService.generateAssistantResponse(conv.id);
    updatedConv = await growthConversationService.getConversation(conv.id);
    expect(updatedConv?.currentStage).toBe('executive_reflection');
    expect(updatedConv?.structuredContext.audience).toBe('cambiar audiencia a Pymes');
  });

  it('debe permitir corregir un dato del Brand Brain en la fase executive_reflection', async () => {
    // 1. Iniciar conversación
    const startedConv = await growthConversationService.startConversation({
      tenantId: 'test', companyId: 'test', userId: 'test'
    });
    const convId = startedConv.id;

    // 2. Llegar a executive_reflection
    await growthConversationService.addTurn({ conversationId: convId, content: 'vender producto', role: 'user' });
    await growthConversationService.generateAssistantResponse(convId);
    await growthConversationService.addTurn({ conversationId: convId, content: 'Aura HCM', role: 'user' });
    await growthConversationService.generateAssistantResponse(convId);
    await growthConversationService.addTurn({ conversationId: convId, content: 'Hoteles', role: 'user' });
    await growthConversationService.generateAssistantResponse(convId);
    await growthConversationService.addTurn({ conversationId: convId, content: 'México', role: 'user' });
    await growthConversationService.generateAssistantResponse(convId);
    await growthConversationService.addTurn({ conversationId: convId, content: 'Aumentar ventas 20%', role: 'user' });
    await growthConversationService.generateAssistantResponse(convId);

    let conv = await growthConversationService.getConversation(convId);
    expect(conv?.currentStage).toBe('executive_reflection');

    // 3. Corregir industria (Brand Brain)
    await growthConversationService.addTurn({ conversationId: convId, content: 'cambiar industria a Software B2B', role: 'user' });
    await growthConversationService.generateAssistantResponse(convId);
    conv = await growthConversationService.getConversation(convId);

    // Debería quedarse en reflection y capturar industria
    expect(conv?.currentStage).toBe('executive_reflection');
    expect(conv?.structuredContext.additionalData?.industry).toBe('cambiar industria a Software B2B');

    // 4. Confirmar
    await growthConversationService.addTurn({ conversationId: convId, content: 'sí, es correcto', role: 'user' });
    await growthConversationService.generateAssistantResponse(convId);
    conv = await growthConversationService.getConversation(convId);
    expect(conv?.currentStage).toBe('executive_proposal');
  });

  it('rejects empty input', async () => {
    const conv = await growthConversationService.startConversation({
      tenantId: 'test', companyId: 'test', userId: 'test'
    });

    await expect(
      growthConversationService.addTurn({ conversationId: conv.id, role: 'user', content: '   ' })
    ).rejects.toThrow('Content cannot be empty');
  });
});
