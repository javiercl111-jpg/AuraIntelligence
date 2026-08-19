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
    expect(updatedConv?.structuredContext.objective).toBe('Quiero vender');
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

    // 4. Send Result -> expect Channels question
    await growthConversationService.addTurn({ conversationId: conv.id, role: 'user', content: 'My result' });
    await growthConversationService.generateAssistantResponse(conv.id);
    updatedConv = await growthConversationService.getConversation(conv.id);
    expect(updatedConv?.currentStage).toBe('understanding_channels');
    expect(updatedConv?.structuredContext.expectedResult).toBe('My result');

    // 5. Send Channels -> expect CTA question
    await growthConversationService.addTurn({
      conversationId: conv.id,
      role: 'user',
      content: 'LinkedIn, Email'
    });
    await growthConversationService.generateAssistantResponse(conv.id);
    updatedConv = await growthConversationService.getConversation(conv.id);
    expect(updatedConv?.currentStage).toBe('understanding_cta');
    expect(updatedConv?.structuredContext.campaignChannels).toEqual([
      'LinkedIn',
      'Email'
    ]);

    // 6. Send CTA -> expect Reflection
    await growthConversationService.addTurn({
      conversationId: conv.id,
      role: 'user',
      content: 'Agendar una demostración'
    });
    await growthConversationService.generateAssistantResponse(conv.id);
    updatedConv = await growthConversationService.getConversation(conv.id);
    expect(updatedConv?.currentStage).toBe('executive_reflection');
    expect(updatedConv?.structuredContext.campaignCallToAction).toBe(
      'Agendar una demostración'
    );
    // 7. Send Confirmation -> expect Proposal
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

    // Fast-forward to reflection through campaign intake
    await growthConversationService.addTurn({ conversationId: conv.id, role: 'user', content: 'Quiero vender Aura HCM' });
    await growthConversationService.generateAssistantResponse(conv.id);
    await growthConversationService.addTurn({ conversationId: conv.id, role: 'user', content: 'My audience' });
    await growthConversationService.generateAssistantResponse(conv.id);
    await growthConversationService.addTurn({ conversationId: conv.id, role: 'user', content: 'My region' });
    await growthConversationService.generateAssistantResponse(conv.id);
    await growthConversationService.addTurn({ conversationId: conv.id, role: 'user', content: 'My result' });
    await growthConversationService.generateAssistantResponse(conv.id);
    await growthConversationService.addTurn({ conversationId: conv.id, role: 'user', content: 'LinkedIn' });
    await growthConversationService.generateAssistantResponse(conv.id);
    await growthConversationService.addTurn({ conversationId: conv.id, role: 'user', content: 'Agendar demo' });
    await growthConversationService.generateAssistantResponse(conv.id);

    let updatedConv = await growthConversationService.getConversation(conv.id);
    expect(updatedConv?.currentStage).toBe('executive_reflection');
    expect(updatedConv?.structuredContext.campaignChannels).toEqual([
      'LinkedIn'
    ]);
    expect(updatedConv?.structuredContext.campaignCallToAction).toBe(
      'Agendar demo'
    );
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

    // 2. Llegar a executive_reflection through campaign intake
    await growthConversationService.addTurn({ conversationId: convId, content: 'vender producto', role: 'user' });
    await growthConversationService.generateAssistantResponse(convId);

    await growthConversationService.addTurn({ conversationId: convId, content: 'Hoteles', role: 'user' });
    await growthConversationService.generateAssistantResponse(convId);
    await growthConversationService.addTurn({ conversationId: convId, content: 'México', role: 'user' });
    await growthConversationService.generateAssistantResponse(convId);
    await growthConversationService.addTurn({ conversationId: convId, content: 'Aumentar ventas 20%', role: 'user' });
    await growthConversationService.generateAssistantResponse(convId);
    await growthConversationService.addTurn({ conversationId: convId, content: 'LinkedIn, Email', role: 'user' });
    await growthConversationService.generateAssistantResponse(convId);
    await growthConversationService.addTurn({ conversationId: convId, content: 'Solicitar una demostración', role: 'user' });
    await growthConversationService.generateAssistantResponse(convId);

    let conv = await growthConversationService.getConversation(convId);
    expect(conv?.currentStage).toBe('executive_reflection');
    expect(conv?.structuredContext.campaignChannels).toEqual([
      'LinkedIn',
      'Email'
    ]);
    expect(conv?.structuredContext.campaignCallToAction).toBe(
      'Solicitar una demostración'
    );
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

  it('captures explicit channel recommendation delegation without treating uncertainty as authorization', async () => {
    const delegated =
      await growthConversationService.startConversation({
        userId: 'user-delegated',
        tenantId: 'tenant-delegated',
        companyId: 'company-delegated',
      });

    await growthConversationService.addTurn({
      conversationId: delegated.id,
      role: 'user',
      content: 'Quiero vender Aura HCM',
    });
    await growthConversationService.generateAssistantResponse(
      delegated.id,
    );

    await growthConversationService.addTurn({
      conversationId: delegated.id,
      role: 'user',
      content: 'Hoteles',
    });
    await growthConversationService.generateAssistantResponse(
      delegated.id,
    );

    await growthConversationService.addTurn({
      conversationId: delegated.id,
      role: 'user',
      content: 'México',
    });
    await growthConversationService.generateAssistantResponse(
      delegated.id,
    );

    await growthConversationService.addTurn({
      conversationId: delegated.id,
      role: 'user',
      content: 'Incrementar ventas 20%',
    });
    await growthConversationService.generateAssistantResponse(
      delegated.id,
    );

    await growthConversationService.addTurn({
      conversationId: delegated.id,
      role: 'user',
      content: 'Aura, recomiéndame',
    });
    await growthConversationService.generateAssistantResponse(
      delegated.id,
    );

    const delegatedState =
      await growthConversationService.getConversation(
        delegated.id,
      );

    expect(
      delegatedState?.currentStage,
    ).toBe('understanding_cta');

    expect(
      delegatedState?.structuredContext
        .campaignChannelRecommendationRequested,
    ).toBe(true);

    expect(
      delegatedState?.structuredContext
        .campaignChannels,
    ).toBeUndefined();

    const uncertain =
      await growthConversationService.startConversation({
        userId: 'user-uncertain',
        tenantId: 'tenant-uncertain',
        companyId: 'company-uncertain',
      });

    await growthConversationService.addTurn({
      conversationId: uncertain.id,
      role: 'user',
      content: 'Quiero vender Aura HCM',
    });
    await growthConversationService.generateAssistantResponse(
      uncertain.id,
    );

    await growthConversationService.addTurn({
      conversationId: uncertain.id,
      role: 'user',
      content: 'Hoteles',
    });
    await growthConversationService.generateAssistantResponse(
      uncertain.id,
    );

    await growthConversationService.addTurn({
      conversationId: uncertain.id,
      role: 'user',
      content: 'México',
    });
    await growthConversationService.generateAssistantResponse(
      uncertain.id,
    );

    await growthConversationService.addTurn({
      conversationId: uncertain.id,
      role: 'user',
      content: 'Incrementar ventas 20%',
    });
    await growthConversationService.generateAssistantResponse(
      uncertain.id,
    );

    await growthConversationService.addTurn({
      conversationId: uncertain.id,
      role: 'user',
      content: 'No sé',
    });
    await growthConversationService.generateAssistantResponse(
      uncertain.id,
    );

    const uncertainState =
      await growthConversationService.getConversation(
        uncertain.id,
      );

    expect(
      uncertainState?.structuredContext
        .campaignChannelRecommendationRequested,
    ).toBe(false);

    expect(
      uncertainState?.structuredContext
        .campaignChannels,
    ).toBeUndefined();
  });
  it("preserves the user's commercial intent while extracting the product", async () => {
    const conversation =
      await growthConversationService.startConversation({
        userId: 'user-objective-parser',
        tenantId: 'tenant-objective-parser',
        companyId: 'company-objective-parser',
      });

    await growthConversationService.addTurn({
      conversationId: conversation.id,
      role: 'user',
      content: 'Quiero comercializar Aura HCM',
    });

    await growthConversationService.generateAssistantResponse(
      conversation.id,
    );

    const state =
      await growthConversationService.getConversation(
        conversation.id,
      );

    expect(
      state?.structuredContext.objective,
    ).toBe('Quiero comercializar');

    expect(
      state?.structuredContext.productOrService,
    ).toBe('Aura HCM');

    expect(
      state?.structuredContext.audience,
    ).toBeUndefined();

    expect(
      state?.structuredContext.region,
    ).toBeUndefined();

    expect(
      state?.structuredContext.expectedResult,
    ).toBeUndefined();

    expect(
      state?.currentStage,
    ).toBe('understanding_audience');
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
