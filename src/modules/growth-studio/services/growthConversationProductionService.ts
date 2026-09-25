import { auth } from '../../../firebase';
// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Growth Conversation Mock Service
// ─────────────────────────────────────────────────────────────

import type {
  IGrowthConversationService,
  StartConversationParams,
  AddTurnParams,
} from './contracts/IGrowthConversationService';
import type {
  GrowthConversation,
  GrowthConversationTurn,
  GrowthConversationStage,
} from '../types/growthConversation';
import { GrowthObjectiveValidator } from './GrowthObjectiveValidator';

/**
 * Global delay for the mock service to simulate AI thinking time.
 * Can be set to 0 for tests.
 */
export let PRODUCTION_RESPONSE_DELAY_MS = 0;

export const setProductionResponseDelay = (ms: number) => {
  PRODUCTION_RESPONSE_DELAY_MS = ms;
};

// In-memory storage for the mock service
const conversations = new Map<string, GrowthConversation>();
const conversationTurns = new Map<string, GrowthConversationTurn[]>();

const generateId = () => Math.random().toString(36).substring(2, 9);

const createTurn = (
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  turnNumber: number
): GrowthConversationTurn => ({
  id: `turn_${generateId()}`,
  conversationId,
  role,
  content,
  turnNumber,
  extractedData: null,
  createdAt: new Date().toISOString(),
});

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type GrowthAdvisorBridgeSuccessV1 = {
  ok: true;
  conversationProposal: {
    nextQuestion: string;
  };
};

function asRecordV1(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function configuredGrowthAdvisorBridgeUrlV1(): string {
  const endpoint = import.meta.env.VITE_GROWTH_ADVISOR_BRIDGE_URL;

  if (typeof endpoint !== 'string' || endpoint.trim().length === 0) {
    throw new Error('GROWTH_ADVISOR_BRIDGE_URL_NOT_CONFIGURED');
  }

  return endpoint.trim();
}

async function getGrowthAdvisorIdTokenV1(): Promise<string> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('GROWTH_ADVISOR_AUTH_REQUIRED');
  }

  return user.getIdToken();
}

function safeContextStringV1(
  conversation: unknown,
  key: string,
): string | undefined {
  const conversationRecord = asRecordV1(conversation);
  const structuredContext = asRecordV1(conversationRecord.structuredContext);
  const additionalData = asRecordV1(
    structuredContext.additionalData,
  );
  const value =
    structuredContext[key] ??
    additionalData[key];

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

async function requestGrowthAdvisorQuestionV1(
  conversation: unknown,
  turnsInput: unknown,
): Promise<string> {
  const endpoint = configuredGrowthAdvisorBridgeUrlV1();
  const token = await getGrowthAdvisorIdTokenV1();

  const turns = Array.isArray(turnsInput)
    ? turnsInput.map((turn) => asRecordV1(turn))
    : [];

  const currentTurn = [...turns]
    .reverse()
    .find((turn) => turn.role !== 'assistant');

  const currentResponse =
    typeof currentTurn?.content === 'string'
      ? currentTurn.content
      : '';

  if (currentResponse.trim().length === 0) {
    throw new Error('GROWTH_ADVISOR_CURRENT_RESPONSE_REQUIRED');
  }

  const conversationHistory = turns
    .filter(
      (turn) =>
        typeof turn.role === 'string' &&
        typeof turn.content === 'string',
    )
    .map((turn) => ({
      role: turn.role as string,
      content: turn.content as string,
    }));

  const askedQuestions = turns
    .filter(
      (turn) =>
        turn.role === 'assistant' &&
        typeof turn.content === 'string',
    )
    .map((turn) => turn.content as string);

  const companyName =
    safeContextStringV1(conversation, 'companyName') ??
    safeContextStringV1(conversation, 'company') ??
    'la organizacion';

  const industry =
    safeContextStringV1(conversation, 'industry') ??
    'No confirmada';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      companyName,
      industry,
      currentResponse,
      conversationHistory,
      confirmedFacts: [],
      pendingHypotheses: [],
      criticalMissingInformation: [],
      askedQuestions,
      advisoryObjective:
        'Profundizar la conversacion ejecutiva de crecimiento.',
      confidenceLevel: 0.5,
      canonicalHypothesis: {
        intent: 'DISCOVER_PROBLEM',
        question: 'Que obstaculo limita hoy el crecimiento comercial?',
      },
    }),
  });

  const raw: unknown = await response.json();
  const payload = asRecordV1(raw);

  if (!response.ok) {
    const error = asRecordV1(payload.error);
    const code =
      typeof error.code === 'string'
        ? error.code
        : `HTTP_${response.status}`;

    throw new Error(`GROWTH_ADVISOR_BRIDGE_ERROR:${code}`);
  }

  if (payload.ok !== true) {
    throw new Error('GROWTH_ADVISOR_BRIDGE_INVALID_RESPONSE');
  }

  const proposal =
    asRecordV1(payload.conversationProposal);

  const nextQuestion =
    proposal.nextQuestion;

  if (
    typeof nextQuestion !== 'string' ||
    nextQuestion.trim().length === 0
  ) {
    throw new Error('GROWTH_ADVISOR_NEXT_QUESTION_MISSING');
  }

  const typedPayload =
    payload as unknown as GrowthAdvisorBridgeSuccessV1;

  return typedPayload.conversationProposal.nextQuestion.trim();
}
export class GrowthConversationProductionService implements IGrowthConversationService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async startConversation(_params: StartConversationParams): Promise<GrowthConversation> {
    if (PRODUCTION_RESPONSE_DELAY_MS > 0) await delay(PRODUCTION_RESPONSE_DELAY_MS);

    const conversation: GrowthConversation = {
      id: `conv_${generateId()}`,
      tenantId: 'growth_demo_tenant', // Enforced by requirements
      companyId: 'growth_demo_company',
      userId: 'growth_demo_user',
      objectiveId: null,
      status: 'active',
      currentStage: 'welcome',
      structuredContext: {},
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    conversations.set(conversation.id, conversation);

    // Initial welcome turn
    const welcomeTurn = createTurn(
      conversation.id,
      'assistant',
      '¡Hola! Soy tu asistente de Aura Growth Studio™. Para empezar, ¿qué producto, servicio o línea de negocio quieres impulsar?',
      1
    );
    conversationTurns.set(conversation.id, [welcomeTurn]);

    // Advance stage automatically to waiting for objective input
    conversation.currentStage = 'understanding_product';

    return { ...conversation };
  }

  async getConversation(conversationId: string): Promise<GrowthConversation | null> {
    const conv = conversations.get(conversationId);
    return conv ? { ...conv } : null;
  }

  async addTurn(params: AddTurnParams): Promise<GrowthConversationTurn> {
    const conv = conversations.get(params.conversationId);
    if (!conv) throw new Error('Conversation not found');
    if (conv.status !== 'active') throw new Error('Conversation is not active');
    if (!params.content.trim()) throw new Error('Content cannot be empty'); // Rule: reject empty entries

    const turns = conversationTurns.get(params.conversationId) || [];
    const newTurnNumber = turns.length + 1;

    const userTurn = createTurn(params.conversationId, params.role, params.content, newTurnNumber);
    turns.push(userTurn);
    conversationTurns.set(params.conversationId, turns);
    conv.updatedAt = new Date().toISOString();

    return userTurn;
  }

  async advanceStage(
    conversationId: string,
    nextStage: GrowthConversationStage
  ): Promise<GrowthConversation> {
    const conv = conversations.get(conversationId);
    if (!conv) throw new Error('Conversation not found');

    conv.currentStage = nextStage;
    conv.updatedAt = new Date().toISOString();

    return { ...conv };
  }

  async completeConversation(conversationId: string): Promise<GrowthConversation> {
    const conv = conversations.get(conversationId);
    if (!conv) throw new Error('Conversation not found');

    conv.status = 'completed';
    conv.currentStage = 'completed';
    conv.updatedAt = new Date().toISOString();

    return { ...conv };
  }

  async abandonConversation(conversationId: string): Promise<GrowthConversation> {
    const conv = conversations.get(conversationId);
    if (!conv) throw new Error('Conversation not found');

    conv.status = 'abandoned';
    conv.updatedAt = new Date().toISOString();

    return { ...conv };
  }

  async getConversationTurns(conversationId: string): Promise<GrowthConversationTurn[]> {
    return [...(conversationTurns.get(conversationId) || [])];
  }

  // Helper method specifically for the mock to generate assistant responses
  // ensuring one question/transition per turn
  async generateAssistantResponse(conversationId: string): Promise<GrowthConversationTurn> {
    if (PRODUCTION_RESPONSE_DELAY_MS > 0) await delay(PRODUCTION_RESPONSE_DELAY_MS);

    const conv = conversations.get(conversationId);
    if (!conv) throw new Error('Conversation not found');

    const turns = conversationTurns.get(conversationId) || [];
    const lastUserTurn = [...turns].reverse().find(t => t.role === 'user');

    let content: string;
    let nextStage = conv.currentStage;

    // State machine logic
    switch (conv.currentStage) {
      case 'understanding_objective': {
        const userInput = lastUserTurn?.content || '';
        const objectiveVerbMatch =
          userInput.match(
            /^(.*?\b(?:vender|comercializar))\s+(.+)$/i,
          );

        if (
          objectiveVerbMatch &&
          objectiveVerbMatch[1] &&
          objectiveVerbMatch[2]
        ) {
          conv.structuredContext.objective =
            objectiveVerbMatch[1].trim();

          conv.structuredContext.productOrService =
            objectiveVerbMatch[2].trim();
        } else {
          conv.structuredContext.objective =
            userInput;
        }
        if (!conv.structuredContext.productOrService) {
          content = '¿Qué producto o servicio deseas impulsar?';
          nextStage = 'understanding_product';
        } else {
          content = 'Entendido. ¿Cuál es la audiencia objetivo a la que nos dirigimos?';
          nextStage = 'understanding_audience';
        }
        break;
      }
      case 'understanding_product':
        conv.structuredContext.productOrService = lastUserTurn?.content;
        content = 'Entendido. ¿Cuál es la audiencia objetivo a la que nos dirigimos?';
        nextStage = 'understanding_audience';
        break;
      case 'understanding_audience':
        conv.structuredContext.audience = lastUserTurn?.content;
        content = 'Perfecto. ¿En qué región o mercado específico nos enfocaremos?';
        nextStage = 'understanding_region';
        break;
      case 'understanding_region':
        conv.structuredContext.region = lastUserTurn?.content;
        content = 'Anotado. Finalmente, ¿qué resultado medible esperas obtener con esto?';
        nextStage = 'understanding_result';
        break;
      case 'understanding_result':
        conv.structuredContext.objective = lastUserTurn?.content;
        conv.structuredContext.expectedResult = lastUserTurn?.content;
        content =
          '¿En qué canales o medios quieres desarrollar esta estrategia? Puedes indicar, por ejemplo, LinkedIn, Facebook, Instagram, email, sitio web u otros.';
        nextStage = 'understanding_channels';
        break;

      case 'understanding_channels': {
        const channelInput =
          lastUserTurn?.content?.trim() || '';

        const normalizedChannelInput =
          channelInput
            .toLocaleLowerCase('es')
            .normalize('NFD')
            .replace(
              /[\u0300-\u036f]/g,
              '',
            );

        const channelUncertain =
          normalizedChannelInput ===
            'no se' ||
          normalizedChannelInput ===
            'no lo se' ||
          normalizedChannelInput ===
            'no estoy seguro' ||
          normalizedChannelInput ===
            'no estoy segura' ||
          normalizedChannelInput ===
            'no tengo preferencia' ||
          normalizedChannelInput ===
            'ninguno' ||
          normalizedChannelInput ===
            'ninguna';
        const recommendationRequested =
          normalizedChannelInput ===
            'recomiendame' ||
          normalizedChannelInput ===
            'aura, recomiendame' ||
          normalizedChannelInput ===
            'aura recomiendame' ||
          normalizedChannelInput ===
            'recomiendame los canales' ||
          normalizedChannelInput ===
            'aura, recomiendame los canales' ||
          normalizedChannelInput ===
            'aura recomiendame los canales';

        conv.structuredContext
          .campaignChannelRecommendationRequested =
            recommendationRequested;

        conv.structuredContext.campaignChannels =
          recommendationRequested ||
          channelUncertain
            ? undefined
            : channelInput
                .split(/[,;]+/)
                .map(channel =>
                  channel.trim(),
                )
                .filter(Boolean);

        content =
          '¿Cuál quieres que sea el llamado a la acción principal de la campaña? Por ejemplo: agendar una conversación, solicitar una demostración, registrarse o contactar al equipo comercial.';
        nextStage = 'understanding_cta';
        break;
      }
      case 'understanding_cta':
        conv.structuredContext.campaignCallToAction =
          lastUserTurn?.content?.trim() || undefined;

        content =
          'Gracias por la información. Aquí tienes un resumen de lo que he entendido.';
        nextStage = 'executive_reflection';
        break;
      case 'executive_reflection': {
        const userMsg = lastUserTurn?.content.toLowerCase() || '';
        // Confirmation
        if (userMsg.includes('sí') || userMsg.includes('correcto') || userMsg.includes('si')) {
          // Re-validate current context before allowing progress
          const validationErrors = GrowthObjectiveValidator.validate({
            goal: conv.structuredContext.objective,
            productOrService: conv.structuredContext.productOrService,
            audience: conv.structuredContext.audience,
            expectedResult: conv.structuredContext.expectedResult
          });

          if (validationErrors.length > 0) {
            content = `Aún faltan datos críticos para completar el objetivo: ${validationErrors.join(', ')}. Por favor, indícame estos datos.`;
          } else {
            content = '¡Excelente! He confirmado tus datos. Generando la propuesta preliminar...';
            nextStage = 'executive_proposal';
          }
        } else {
          // Correction logic for both Objective and Brand Brain
          if (userMsg.includes('objetivo') || userMsg.includes('meta')) {
            conv.structuredContext.objective = lastUserTurn?.content; // simplistic mock capture
            content = 'He actualizado el objetivo. ¿La información actual es correcta o deseas corregir algo más?';
          } else if (userMsg.includes('audiencia')) {
            conv.structuredContext.audience = lastUserTurn?.content;
            content = 'He actualizado la audiencia. ¿La información actual es correcta o deseas corregir algo más?';
          } else if (userMsg.includes('región') || userMsg.includes('region')) {
            conv.structuredContext.region = lastUserTurn?.content;
            content = 'He actualizado la región. ¿La información actual es correcta o deseas corregir algo más?';
          } else if (userMsg.includes('resultado')) {
            conv.structuredContext.expectedResult = lastUserTurn?.content;
            content = 'He actualizado el resultado esperado. ¿La información actual es correcta o deseas corregir algo más?';
          } else if (userMsg.includes('industria')) {
            conv.structuredContext.additionalData = { ...conv.structuredContext.additionalData, industry: lastUserTurn?.content };
            content = 'He actualizado la industria del Brand Brain. ¿Deseas corregir algo más o todo es correcto?';
          } else if (userMsg.includes('propuesta de valor') || userMsg.includes('valor')) {
            conv.structuredContext.additionalData = { ...conv.structuredContext.additionalData, valueProposition: lastUserTurn?.content };
            content = 'He actualizado la propuesta de valor del Brand Brain. ¿Deseas corregir algo más?';
          } else if (userMsg.includes('diferenciador')) {
            const diffs = conv.structuredContext.additionalData?.differentiators as string[] || [];
            conv.structuredContext.additionalData = { ...conv.structuredContext.additionalData, differentiators: [...diffs, lastUserTurn?.content] };
            content = 'He actualizado los diferenciadores del Brand Brain. ¿Algo más?';
          } else {
            content = '¿Qué campo específico deseas corregir? (ej. objetivo, audiencia, industria, propuesta de valor)';
          }
        }
        break;
      }
      case 'executive_proposal':
        content = 'Propuesta generada. ¿Deseas aprobarla para finalizar?';
        nextStage = 'completed';
        break;
      default:
        content = 'La conversación ha concluido.';
        break;
    }

    if (nextStage !== conv.currentStage) {
      await this.advanceStage(conversationId, nextStage);
    }

    const turnNumber = turns.length + 1;
    await requestGrowthAdvisorQuestionV1(conv, turns);

    const assistantTurn = createTurn(conversationId, 'assistant', content, turnNumber);
    turns.push(assistantTurn);
    conversationTurns.set(conversationId, turns);

    if (nextStage === 'completed') {
       await this.completeConversation(conversationId);
    }

    return assistantTurn;
  }
}

export const growthConversationService = new GrowthConversationProductionService();
export default growthConversationService;
