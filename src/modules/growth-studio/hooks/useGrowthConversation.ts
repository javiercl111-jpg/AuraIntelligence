// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — useGrowthConversation Hook
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import type { GrowthConversation, GrowthConversationTurn } from '../types/growthConversation';
import type { GrowthObjective } from '../types/growthObjective';
import { growthConversationService } from '../services/growthConversationMockService';
import { growthObjectiveService } from '../services/growthObjectiveMockService';

export const useGrowthConversation = () => {
  const [conversation, setConversation] = useState<GrowthConversation | null>(null);
  const [turns, setTurns] = useState<GrowthConversationTurn[]>([]);
  const [objective, setObjective] = useState<GrowthObjective | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setIsTyping(true);
    setError(null);
    try {
      const conv = await growthConversationService.startConversation({
        tenantId: 'growth_demo_tenant',
        companyId: 'growth_demo_company',
        userId: 'growth_demo_user',
      });
      setConversation(conv);
      const convTurns = await growthConversationService.getConversationTurns(conv.id);
      setTurns(convTurns);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar la conversación');
    } finally {
      setIsTyping(false);
    }
  }, []);

  const addTurn = useCallback(async (content: string) => {
    if (!conversation) return;
    if (isTyping) return; // Rule: Block submission if already typing
    if (!content.trim()) return; // Rule: Reject empty submission

    setIsTyping(true);
    setError(null);
    try {
      // 1. Add user turn
      await growthConversationService.addTurn({
        conversationId: conversation.id,
        content,
        role: 'user',
      });

      // Update UI with user turn immediately
      let updatedTurns = await growthConversationService.getConversationTurns(conversation.id);
      setTurns(updatedTurns);

      // 2. Generate assistant response
      await growthConversationService.generateAssistantResponse(conversation.id);

      // Update UI with assistant turn and new conversation state
      updatedTurns = await growthConversationService.getConversationTurns(conversation.id);
      setTurns(updatedTurns);
      
      const updatedConv = await growthConversationService.getConversation(conversation.id);
      if (updatedConv) {
        setConversation(updatedConv);
        // 3. Update Objective if in reflection or proposal phase
        if (updatedConv.currentStage === 'executive_reflection' || updatedConv.currentStage === 'executive_proposal' || updatedConv.currentStage === 'completed') {
          // If we transitioned to proposal/completed, the user confirmed it.
          const isConfirmed = updatedConv.currentStage === 'executive_proposal' || updatedConv.currentStage === 'completed';
          const newObj = await growthObjectiveService.buildAndSaveObjective(updatedConv.id, updatedConv.structuredContext, isConfirmed);
          setObjective(newObj);
        }
      }
      
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar el mensaje');
    } finally {
      setIsTyping(false);
    }
  }, [conversation, isTyping]);

  return {
    conversation,
    turns,
    objective,
    isTyping,
    error,
    start,
    addTurn,
  };
};
