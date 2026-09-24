// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — useGrowthConversation Hook
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import type { AuraIntelligenceContext } from '../../../types/auraIntelligence';
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

interface GrowthConversationRuntimeOptions {
  readonly context?: AuraIntelligenceContext;
  readonly companyName?: string;
}

export const useGrowthConversation = (
  options: GrowthConversationRuntimeOptions = {},
) => {
  const {
    context,
    companyName,
  } = options;

  const hasRuntimeIdentity =
    Boolean(
      companyName?.trim() ||
      (
        context?.userName?.trim() &&
        context.userName !== 'Administrador Aura' &&
        !context.userName.includes('@')
      ) ||
      (
        context?.userEmail?.trim() &&
        context.userEmail !== 'admin@aura.demo'
      )
    );
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

  const contextualizeTurns =
    useCallback(
      (
        sourceTurns: GrowthConversationTurn[],
      ): GrowthConversationTurn[] => {
        if (!hasRuntimeIdentity) {
          return sourceTurns;
        }

        const rawUserName =
          context?.userName?.trim() ||
          '';

        const resolvedUserName =
          rawUserName &&
          rawUserName !== 'Administrador Aura' &&
          !rawUserName.includes('@')
            ? rawUserName
            : '';

        const resolvedCompanyName =
          companyName?.trim() ||
          '';

        return sourceTurns.map(
          (turn, index) => {
            if (
              index !== 0 ||
              turn.role !== 'assistant'
            ) {
              return turn;
            }

            const greeting =
              resolvedUserName
                ? `Hola, ${resolvedUserName}.`
                : 'Hola.';

            const companyContext =
              resolvedCompanyName
                ? ` Ya tengo identificado el contexto de ${resolvedCompanyName}.`
                : '';

            return {
              ...turn,
              content:
                `${greeting}${companyContext} Voy a utilizar ese contexto y preguntarte sólo lo que falte para completar la estrategia. Para esta iniciativa, ¿qué producto, servicio o línea de negocio quieres impulsar?`,
            };
          },
        );
      },
      [
        companyName,
        context?.companyId,
        context?.userName,
        hasRuntimeIdentity,
      ],
    );

  const start = useCallback(async () => {
    setIsTyping(true);
    setError(null);
    try {
      const conv = await growthConversationService.startConversation({
        tenantId:
          context?.tenantId ||
          'growth_demo_tenant',
        companyId:
          context?.companyId ||
          'growth_demo_company',
        userId:
          context?.userId ||
          'growth_demo_user',
      });

      if (hasRuntimeIdentity) {
        Object.assign(conv.structuredContext, {
          ...conv.structuredContext,
          additionalData: {
            ...(
              conv.structuredContext
                .additionalData ||
              {}
            ),
            tenantId:
              context?.tenantId,
            companyId:
              context?.companyId,
            companyName:
              companyName?.trim() ||
              undefined,
            userName:
              context?.userName?.trim() ||
              undefined,
            userEmail:
              context?.userEmail?.trim() ||
              undefined,
          },
        });
      }

      setConversation(conv);

      if (hasRuntimeIdentity) {
        const initialBrain =
          await brandBrainMockService.buildBrandBrain(
            conv.id,
            conv.structuredContext,
          );

        setBrandBrain(initialBrain);
      }

      const convTurns =
        await growthConversationService
          .getConversationTurns(
            conv.id,
          );

      setTurns(
        contextualizeTurns(
          convTurns,
        ),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar la conversación');
    } finally {
      setIsTyping(false);
      setLoading(false);
    }
  }, [
    companyName,
    context,
    contextualizeTurns,
    hasRuntimeIdentity,
  ]);

  const addTurn = useCallback(async (content: string) => {
    if (!conversation) return;
    if (isTyping) return; // Rule: Block submission if already typing
    if (!content.trim()) return; // Rule: Reject empty submission

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

      // Update UI with user turn immediately
      let updatedTurns = await growthConversationService.getConversationTurns(conversation.id);
      setTurns(contextualizeTurns(updatedTurns));

      // 2. Generate assistant response
      await growthConversationService.generateAssistantResponse(conversation.id);

      // Update UI with assistant turn and new conversation state
      updatedTurns = await growthConversationService.getConversationTurns(conversation.id);
      setTurns(contextualizeTurns(updatedTurns));

      const updatedConv = await growthConversationService.getConversation(conversation.id);
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
          setBrandBrain(bb);

          // Build Campaign Strategy
          const strategy = await campaignStrategyMockService.buildStrategy(
            updatedConv.tenantId,
            updatedConv.companyId,
            obj.id,
            bb.id,
            updatedConv.id
          );
          setCampaignStrategy(strategy);

          // Build Executive Execution Plan
          const loadedExecution = await executiveExecutionPlanMockService.getPlan(conversationId);
          setExecution(loadedExecution);

          let loadedContentPlan = await contentPlanMockService.getPlan(conversationId);
          if (!loadedContentPlan && loadedExecution?.status === 'confirmed') {
            loadedContentPlan = await contentPlanMockService.generatePlan(conversationId);
          }
          setContentPlan(loadedContentPlan);

          let loadedBrief = await executiveContentBriefMockService.getBrief(conversationId);
          if (!loadedBrief && loadedContentPlan) {
            loadedBrief = await executiveContentBriefMockService.generateBrief(conversationId);
          }
          setContentBrief(loadedBrief);
        }
      }

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar el mensaje');
    } finally {
      setIsTyping(false);
    }
  }, [
    conversation,
    contextualizeTurns,
    isTyping,
  ]);

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
