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

  it('progresses through the full state machine', async () => {
    const conv = await growthConversationService.startConversation({
      tenantId: 'test', companyId: 'test', userId: 'test'
    });

    // 1. Send Objective -> expect Audience question
    await growthConversationService.addTurn({ conversationId: conv.id, role: 'user', content: 'My objective' });
    await growthConversationService.generateAssistantResponse(conv.id);
    let updatedConv = await growthConversationService.getConversation(conv.id);
    expect(updatedConv?.currentStage).toBe('understanding_audience');
    expect(updatedConv?.structuredContext.objective).toBe('My objective');

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

    // 5. Send Correction (Not saying 'sí') -> expect to stay in reflection
    await growthConversationService.addTurn({ conversationId: conv.id, role: 'user', content: 'No, quiero cambiar algo' });
    await growthConversationService.generateAssistantResponse(conv.id);
    updatedConv = await growthConversationService.getConversation(conv.id);
    expect(updatedConv?.currentStage).toBe('executive_reflection');

    // 6. Send Confirmation -> expect Proposal
    await growthConversationService.addTurn({ conversationId: conv.id, role: 'user', content: 'Sí, es correcto' });
    await growthConversationService.generateAssistantResponse(conv.id);
    updatedConv = await growthConversationService.getConversation(conv.id);
    expect(updatedConv?.currentStage).toBe('executive_proposal');

    // 7. Send Final Approval -> expect Completed
    await growthConversationService.addTurn({ conversationId: conv.id, role: 'user', content: 'Aprobar' });
    await growthConversationService.generateAssistantResponse(conv.id);
    updatedConv = await growthConversationService.getConversation(conv.id);
    expect(updatedConv?.currentStage).toBe('completed');
    expect(updatedConv?.status).toBe('completed');
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
