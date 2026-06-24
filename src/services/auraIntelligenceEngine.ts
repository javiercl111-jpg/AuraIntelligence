import { searchKnowledgeArticles } from './auraKnowledgeService';
import { saveAuraConversationAudit } from './auraConversationService';
import { detectAuraIntent } from './auraIntentEngine';
import { detectAuraOperationalIntent } from './auraOperationalIntentEngine';
import { buildAuraResponse } from './auraResponseEngine';
import { buildRuntimeContext, resolveAuraContext } from './auraContextEngine';
import { suggestAuraActions } from './auraActionEngine';
import { generateAuraAIAnswer } from './auraAIGateway';

import {
  estimateAuraCostUsd,
  estimateAuraTokenUsage,
  getDefaultAuraUsageLimits,
  validateAuraUsage,
} from './auraUsageEngine';

import { buildAuraHCMConnectorContext } from './auraHCMConnectorService';
import { buildAuraMaintenanceConnectorContext } from './auraMaintenanceConnectorService';
import { answerAuraMaintenanceQuestion } from './auraMaintenanceIntelligence';
import { buildAuraSignatureConnectorContext } from './auraSignatureConnectorService';
import { answerAuraSignatureQuestion } from './auraSignatureIntelligence';
import { resolveAuraPreparedAction } from './auraPreparedActionResolver';
import answerAuraOperationalQuestion from '../modules/operational-intelligence/services/auraOperationalIntelligenceService';

import type {
  AuraAskRequest,
  AuraAskResponse,
  AuraSystem,
} from '../types/auraIntelligence';

const buildFallbackResponse = (): AuraAskResponse => ({
  answer:
    'No encontré información suficiente en la base de conocimiento de Aura. Intenta reformular la pregunta o contacta al administrador.',
  matchedArticles: [],
  confidence: 'low',
  confidenceScore: 0,
  sources: [],
  relatedArticles: [],
  suggestedActions: [],
  preparedAction: null,
});

const resolveSearchSystem = (
  detectedSystem: string,
  fallbackSystem: AuraSystem
): AuraSystem => {
  if (
    detectedSystem === 'aura_hcm' ||
    detectedSystem === 'aura_maintenance' ||
    detectedSystem === 'aura_signature' ||
    detectedSystem === 'aura_control_center' ||
    detectedSystem === 'aura_intelligence'
  ) {
    return detectedSystem;
  }

  return fallbackSystem;
};

const resolveOperationalSystem = (source: string): AuraSystem | null => {
  if (source === 'maintenance') return 'aura_maintenance';
  if (source === 'signature') return 'aura_signature';
  if (source === 'hcm') return 'aura_hcm';

  return null;
};

const mapConfidenceLabel = (
  label: 'low' | 'medium' | 'high'
): AuraAskResponse['confidence'] => label;

export const askAuraIntelligence = async (
  request: AuraAskRequest
): Promise<AuraAskResponse> => {
  try {
    const intent = detectAuraIntent(request.question);
    const operationalIntent = detectAuraOperationalIntent(request.question);
    const operationalSystem = resolveOperationalSystem(operationalIntent.source);
    const suggestedActions = suggestAuraActions(intent);
    const preparedAction = resolveAuraPreparedAction(request.question);

    const hcmContext = await buildAuraHCMConnectorContext({
      userEmail: request.context.userEmail,
      fallbackCompanyId: request.context.companyId,
      fallbackRole: request.context.role,
      fallbackProfileId: request.context.profileId,
      fallbackPermissions: request.context.permissions || [],
    });

    const runtimeContext = buildRuntimeContext({
      tenantId: request.context.tenantId,
      companyId:
        hcmContext.company?.companyId ||
        hcmContext.employee?.companyId ||
        request.context.companyId,
      userId: request.context.userId,
      userEmail: hcmContext.employee?.email || request.context.userEmail,
      userName: hcmContext.employee?.displayName || request.context.userName,
      role:
        hcmContext.employee?.role ||
        hcmContext.profile?.role ||
        request.context.role,
      profileId:
        hcmContext.employee?.profileId ||
        hcmContext.profile?.profileId ||
        request.context.profileId,
      permissions:
        hcmContext.permissions.permissions.length > 0
          ? hcmContext.permissions.permissions
          : request.context.permissions || [],
      system: request.context.system,
      module: request.context.module,
      route: request.context.route,
      language: request.context.language,
      source: 'widget',
    });

    const resolvedContext = resolveAuraContext({
      fallbackContext: runtimeContext,
      detectedSystem: operationalSystem || intent.system,
      detectedModule: intent.moduleId,
    });

    const searchSystem =
      operationalSystem ||
      resolveSearchSystem(resolvedContext.system, request.context.system);

    const maintenanceContext =
      searchSystem === 'aura_maintenance'
        ? await buildAuraMaintenanceConnectorContext(resolvedContext.companyId)
        : null;

    const maintenanceAnswer = maintenanceContext
      ? answerAuraMaintenanceQuestion({
          question: request.question,
          context: maintenanceContext,
        })
      : null;

    const signatureContext =
      searchSystem === 'aura_signature'
        ? await buildAuraSignatureConnectorContext(resolvedContext.companyId)
        : null;

    const signatureAnswer = signatureContext
      ? answerAuraSignatureQuestion({
          question: request.question,
          context: signatureContext,
        })
      : null;

    const operationalAnswer = await answerAuraOperationalQuestion({
      question: request.question,
      companyId: resolvedContext.companyId,
      employeeId: hcmContext.employee?.employeeId,
      role: resolvedContext.role,
    });

    const connectorAnswer = operationalAnswer || maintenanceAnswer || signatureAnswer;

    const articles = connectorAnswer
      ? []
      : await searchKnowledgeArticles(
          request.question,
          searchSystem,
          resolvedContext.module,
          resolvedContext.language
        );

    const auraResponse = buildAuraResponse({
      articles,
      intent,
    });

    const usageLimits = {
      ...getDefaultAuraUsageLimits(),
      companyId: resolvedContext.companyId,
      aiEnabled: Boolean(
        hcmContext.company?.aiEnabled || getDefaultAuraUsageLimits().aiEnabled
      ),
    };

    const usageValidation = validateAuraUsage({
      limits: usageLimits,
      confidenceScore: connectorAnswer ? 90 : auraResponse.confidenceScore,
    });

    const shouldUseExternalAI =
      usageValidation.allowed &&
      usageValidation.mode !== 'knowledge_only' &&
      !connectorAnswer &&
      !preparedAction;

    const preparedActionAnswer = preparedAction
      ? `He preparado una acción: ${preparedAction.title}. Revisa los campos requeridos antes de confirmar.`
      : null;

    const knowledgeAnswer =
      connectorAnswer || preparedActionAnswer || auraResponse.answer;

    const promptTokenEstimate = estimateAuraTokenUsage(
      [
        request.question,
        resolvedContext.system,
        resolvedContext.module || '',
        connectorAnswer || '',
        preparedActionAnswer || '',
        auraResponse.matchedArticles
          .map((article) => `${article.title}\n${article.content}`)
          .join('\n\n'),
      ].join('\n')
    );

    let finalAnswer = knowledgeAnswer;

    let aiProvider = connectorAnswer
      ? searchSystem === 'aura_signature'
        ? 'signature_connector'
        : 'maintenance_connector'
      : preparedAction
        ? 'prepared_action'
        : 'knowledge_only';

    let aiModel = connectorAnswer
      ? searchSystem === 'aura_signature'
        ? 'aura-signature-intelligence-v1'
        : 'aura-maintenance-intelligence-v1'
      : preparedAction
        ? 'aura-copilot-actions-v2'
        : 'aura-knowledge-engine-v1';

    let aiUsedArticleIds = auraResponse.matchedArticles.map(
      (article) => article.id
    );

    let aiSafetyNotes: string[] = [
      connectorAnswer
        ? `Respuesta generada desde ${searchSystem} Connector sin IA externa.`
        : preparedAction
          ? 'Acción preparada sin modificar datos reales. Requiere confirmación humana.'
          : usageValidation.reason ||
            'Respuesta generada desde Knowledge Base sin IA externa.',
    ];

    let completionTokenEstimate = estimateAuraTokenUsage(finalAnswer);

    if (shouldUseExternalAI) {
      const aiResponse = await generateAuraAIAnswer({
        provider: usageLimits.preferredProvider,
        question: request.question,
        context: resolvedContext,
        intent,
        articles: auraResponse.matchedArticles,
      });

      finalAnswer = aiResponse.answer || knowledgeAnswer;
      aiProvider = aiResponse.provider;
      aiModel = aiResponse.model || usageLimits.preferredModel;
      aiUsedArticleIds = aiResponse.usedArticleIds;
      aiSafetyNotes = aiResponse.safetyNotes || [];
      completionTokenEstimate = estimateAuraTokenUsage(finalAnswer);
    }

    const estimatedCostUsd = estimateAuraCostUsd({
      provider: aiProvider,
      promptTokens: promptTokenEstimate,
      completionTokens: completionTokenEstimate,
    });

    const responseConfidenceScore =
      connectorAnswer || preparedAction
        ? 90
        : auraResponse.confidenceScore;

    const responseConfidenceLabel =
      connectorAnswer || preparedAction
        ? 'high'
        : auraResponse.confidenceLabel;

    const commonMetadata = {
      detectedIntent: intent.intentId,
      detectedSystem: intent.system,
      detectedModule: intent.moduleId || null,
      detectedCategory: intent.categoryId || null,
      intentConfidence: intent.confidence,
      matchedKeywords: intent.matchedKeywords,
      operationalIntent,
      preparedAction,
      resolvedSystem: resolvedContext.system,
      resolvedModule: resolvedContext.module || null,
      contextConfidence: resolvedContext.confidence,
      contextWarnings: resolvedContext.warnings,
      responseConfidenceScore,
      responseConfidenceLabel,
      sources: connectorAnswer || preparedAction ? [] : auraResponse.sources,
      relatedArticles:
        connectorAnswer || preparedAction ? [] : auraResponse.relatedArticles,
      suggestedActions,
      usageMode: usageValidation.mode,
      usageAllowed: usageValidation.allowed,
      usageReason: usageValidation.reason || null,
      estimatedPromptTokens: promptTokenEstimate,
      estimatedCompletionTokens: completionTokenEstimate,
      estimatedTotalTokens: promptTokenEstimate + completionTokenEstimate,
      estimatedCostUsd,
      aiProvider,
      aiModel,
      aiUsedArticleIds,
      aiSafetyNotes,
      hcmEmployee: hcmContext.employee,
      hcmProfile: hcmContext.profile,
      hcmPermissions: hcmContext.permissions,
      hcmCompany: hcmContext.company,
      maintenanceContext,
      maintenanceAnswer,
      signatureContext,
      signatureAnswer,
      originalContextSystem: request.context.system,
      originalContextModule: request.context.module || null,
    };

    if (
      !auraResponse.matchedArticles.length &&
      !connectorAnswer &&
      !preparedAction
    ) {
      const fallbackResponse = {
        ...buildFallbackResponse(),
        answer: finalAnswer || buildFallbackResponse().answer,
        suggestedActions,
        preparedAction,
      };

      await saveAuraConversationAudit({
        tenantId: resolvedContext.tenantId,
        companyId: resolvedContext.companyId,
        userId: resolvedContext.userId,
        userEmail: resolvedContext.userEmail,
        userName: resolvedContext.userName,
        system: searchSystem,
        module: resolvedContext.module,
        route: resolvedContext.route,
        language: resolvedContext.language,
        question: request.question,
        answer: fallbackResponse.answer,
        matchedArticleIds: [],
        createdAt: new Date().toISOString(),
        metadata: commonMetadata,
      });

      return fallbackResponse;
    }

    await saveAuraConversationAudit({
      tenantId: resolvedContext.tenantId,
      companyId: resolvedContext.companyId,
      userId: resolvedContext.userId,
      userEmail: resolvedContext.userEmail,
      userName: resolvedContext.userName,
      system: searchSystem,
      module: resolvedContext.module,
      route: resolvedContext.route,
      language: resolvedContext.language,
      question: request.question,
      answer: finalAnswer,
      matchedArticleIds:
        connectorAnswer || preparedAction
          ? []
          : auraResponse.matchedArticles.map((article) => article.id),
      createdAt: new Date().toISOString(),
      metadata: commonMetadata,
    });

    return {
      answer: finalAnswer,
      matchedArticles:
        connectorAnswer || preparedAction ? [] : auraResponse.matchedArticles,
      confidence:
        connectorAnswer || preparedAction
          ? 'high'
          : mapConfidenceLabel(auraResponse.confidenceLabel),
      confidenceScore: responseConfidenceScore,
      sources: connectorAnswer || preparedAction ? [] : auraResponse.sources,
      relatedArticles:
        connectorAnswer || preparedAction ? [] : auraResponse.relatedArticles,
      suggestedActions,
      preparedAction,
    };
  } catch (error) {
    console.error('[Aura Intelligence] Error processing question:', error);

    return buildFallbackResponse();
  }
};