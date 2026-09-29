// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — useGrowthConversation Hook
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useRef, useLayoutEffect } from 'react';
import type { BusinessProfile } from '../types/businessProfile';
import type { AuraRuntimeContext } from '../../../types/auraContext';
import { GrowthContextBootstrap } from '../services/GrowthContextBootstrap';
import { db } from '../../../firebase';
import { createGrowthCommercialContextRepository } from '../services/growthCommercialContextRepository';
import type { GrowthConversation, GrowthConversationTurn } from '../types/growthConversation';
import type { GrowthObjective } from '../types/growthObjective';
import type { BrandBrain } from '../types/brandBrain';
import type { CampaignStrategy } from '../types/campaignStrategy';
import { growthConversationService } from '../services/growthConversationProductionService';
import { growthObjectiveService } from '../services/growthObjectiveMockService';
import { brandBrainMockService } from '../services/brandBrainMockService';
import { campaignStrategyMockService } from '../services/campaignStrategyMockService';
import type { ExecutiveExecutionPlan } from '../types/executiveExecutionPlan';
import { executiveExecutionPlanMockService } from '../services/executiveExecutionPlanMockService';
import type { ContentPlan } from '../types/contentPlan';
import { contentPlanMockService } from '../services/contentPlanMockService';
import type { ExecutiveContentBrief } from '../types/executiveContentBrief';
import { executiveContentBriefMockService } from '../services/executiveContentBriefMockService';

export const useGrowthConversation = (runtimeContext?: AuraRuntimeContext, businessProfile?: BusinessProfile) => {
  const submissionInFlight = useRef(false);
  const [conversation, setConversation] = useState<GrowthConversation | null>(null);
  const [turns, setTurns] = useState<GrowthConversationTurn[]>([]);

  const [objective, setObjective] = useState<GrowthObjective | null>(null);
  const [brandBrain, setBrandBrain] = useState<BrandBrain | null>(null);
  const [campaignStrategy, setCampaignStrategy] = useState<CampaignStrategy | null>(null);
  const [execution, setExecution] = useState<ExecutiveExecutionPlan | null>(null);
  const [contentPlan, setContentPlan] = useState<ContentPlan | null>(null);
  const [contentBrief, setContentBrief] = useState<ExecutiveContentBrief | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const identityKey = JSON.stringify([runtimeContext?.userId, runtimeContext?.companyId]);
  const activeIdentity = useRef(identityKey);
  const loadGeneration = useRef(0);
  const mounted = useRef(false);
  const clearSession = useCallback(() => {
    setConversation(null);
    setTurns([]);
    setObjective(null);
    setBrandBrain(null);
    setCampaignStrategy(null);
    setExecution(null);
    setContentPlan(null);
    setContentBrief(null);
    submissionInFlight.current = false;
  }, []);

  useLayoutEffect(() => {
    mounted.current = true;
    activeIdentity.current = identityKey;
    loadGeneration.current += 1;
    clearSession();
    setError(null);
    setIsTyping(false);
    setLoading(true);
    return () => {
      mounted.current = false;
      loadGeneration.current += 1;
    };
  }, [identityKey, clearSession]);

  const start = useCallback(async () => {
    if (!mounted.current || activeIdentity.current !== identityKey) return;
    const generation = ++loadGeneration.current;
    const isCurrent = () => mounted.current && activeIdentity.current === identityKey &&
      loadGeneration.current === generation;
    clearSession();
    setLoading(true);
    setIsTyping(true);
    setError(null);
    try {
      if (!runtimeContext) {
        throw new Error('Growth Advisor requires authenticated runtime context');
      }

      const bootstrap = await GrowthContextBootstrap.hydrate({
        runtimeContext,
        businessProfile,
        repository: createGrowthCommercialContextRepository(db),
      });
      if (!isCurrent()) return;

      const conv = await growthConversationService.startConversation({
        tenantId: bootstrap.runtimeContext.tenantId,
        companyId: bootstrap.runtimeContext.companyId,
        userId: bootstrap.runtimeContext.userId,
        userName: bootstrap.runtimeContext.userName,
        businessProfile: bootstrap.businessProfile,
      });
      if (!isCurrent()) return;
      const convTurns = await growthConversationService.getConversationTurns(conv.id);
      if (!isCurrent()) return;
      setConversation(conv);
      setTurns(convTurns);
    } catch (err: unknown) {
      if (!isCurrent()) return;
      setError(err instanceof Error ? err.message : 'Error al iniciar la conversación');
    } finally {
      if (isCurrent()) {
        setIsTyping(false);
        setLoading(false);
      }
    }
  }, [runtimeContext, businessProfile, identityKey, clearSession]);

  const addTurn = useCallback(async (content: string) => {
    if (!conversation) return;
    if (isTyping || submissionInFlight.current) return; // Rule: Block submission if already typing
    if (!content.trim()) return; // Rule: Reject empty submission
    if (!mounted.current || conversation.userId !== runtimeContext?.userId ||
      conversation.companyId !== runtimeContext?.companyId) return;

    submissionInFlight.current = true;
    const generation = loadGeneration.current;
    const isCurrent = () => mounted.current && activeIdentity.current === identityKey &&
      generation === loadGeneration.current;
    const conversationId = conversation.id;
    setIsTyping(true);
    setError(null);
    try {
      // 1. Add user turn
      await growthConversationService.addTurn({
        conversationId: conversation.id,
        content,
        role: 'user',
      });
      if (!isCurrent()) return;

      // Update UI with user turn immediately
      let updatedTurns = await growthConversationService.getConversationTurns(conversation.id);
      if (!isCurrent()) return;
      setTurns(updatedTurns);

      // 2. Generate assistant response
      await growthConversationService.generateAssistantResponse(conversation.id);
      if (!isCurrent()) return;

      // Update UI with assistant turn and new conversation state
      updatedTurns = await growthConversationService.getConversationTurns(conversation.id);
      if (!isCurrent()) return;
      setTurns(updatedTurns);

      const updatedConv = await growthConversationService.getConversation(conversation.id);
      if (!isCurrent()) return;
      if (updatedConv) {
        setConversation(updatedConv);
        // 3. Update Objective if in reflection or proposal phase
        if (updatedConv.currentStage === 'executive_reflection' || updatedConv.currentStage === 'executive_proposal' || updatedConv.currentStage === 'completed') {
          // If we transitioned to proposal/completed, the user confirmed it.
          const isConfirmed = updatedConv.currentStage !== 'executive_reflection';
          const obj = await growthObjectiveService.buildAndSaveObjective(
            conversation.id,
            updatedConv.structuredContext,
            isConfirmed
          );
          if (!isCurrent()) return;
          setObjective(obj);

          // Build Brand Brain
          // During reflection, if we have explicit confirmations, we pass them.
          // For now, we simulate an explicitConfirmation if isConfirmed is true (user confirmed all).
          const explicitConfirmations: Record<string, boolean> = {};
          if (isConfirmed) {
            explicitConfirmations['industry'] = true;
            explicitConfirmations['products'] = true;
            explicitConfirmations['valueProposition'] = true;
            explicitConfirmations['targetAudience'] = true;
            explicitConfirmations['brandTone'] = true;
            explicitConfirmations['differentiators'] = true;
            explicitConfirmations['communicationStyle'] = true;
            explicitConfirmations['businessGoals'] = true;
          }

          const bb = await brandBrainMockService.buildBrandBrain(
            conversation.id,
            updatedConv.structuredContext,
            explicitConfirmations
          );
          if (!isCurrent()) return;
          setBrandBrain(bb);

          // Build Campaign Strategy
          const strategy = await campaignStrategyMockService.buildStrategy(
            updatedConv.tenantId,
            updatedConv.companyId,
            obj.id,
            bb.id,
            updatedConv.id
          );
          if (!isCurrent()) return;
          setCampaignStrategy(strategy);

          // Build Executive Execution Plan
          const loadedExecution = await executiveExecutionPlanMockService.getPlan(conversationId);
          if (!isCurrent()) return;
          setExecution(loadedExecution);

          let loadedContentPlan = await contentPlanMockService.getPlan(conversationId);
          if (!isCurrent()) return;
          if (!loadedContentPlan && loadedExecution?.status === 'confirmed') {
            loadedContentPlan = await contentPlanMockService.generatePlan(conversationId);
            if (!isCurrent()) return;
          }
          setContentPlan(loadedContentPlan);

          let loadedBrief = await executiveContentBriefMockService.getBrief(conversationId);
          if (!isCurrent()) return;
          if (!loadedBrief && loadedContentPlan) {
            loadedBrief = await executiveContentBriefMockService.generateBrief(conversationId);
            if (!isCurrent()) return;
          }
          setContentBrief(loadedBrief);
        }
      }

    } catch (err: unknown) {
      if (!isCurrent()) return;
      setError(err instanceof Error ? err.message : 'Error al enviar el mensaje');
    } finally {
      if (isCurrent()) {
        submissionInFlight.current = false;
        setIsTyping(false);
      }
    }
  }, [conversation, isTyping, runtimeContext?.userId, runtimeContext?.companyId, identityKey]);

  return {
    conversation,
    turns,
    objective,
    brandBrain,
    campaignStrategy,
    execution,
    contentPlan,
    contentBrief,
    isTyping,
    loading,
    error,
    start,
    addTurn,
  };
};
