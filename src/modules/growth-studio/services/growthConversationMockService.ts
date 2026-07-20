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
export let MOCK_RESPONSE_DELAY_MS = 1000;

export const setMockResponseDelay = (ms: number) => {
  MOCK_RESPONSE_DELAY_MS = ms;
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

export class GrowthConversationMockService implements IGrowthConversationService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async startConversation(_params: StartConversationParams): Promise<GrowthConversation> {
    if (MOCK_RESPONSE_DELAY_MS > 0) await delay(MOCK_RESPONSE_DELAY_MS);

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
      '¡Hola! Soy tu asistente de Aura Growth Studio™. Para empezar a definir nuestra campaña de crecimiento, ¿cuál es el objetivo principal que deseas alcanzar?',
      1
    );
    conversationTurns.set(conversation.id, [welcomeTurn]);

    // Advance stage automatically to waiting for objective input
    conversation.currentStage = 'understanding_objective';

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
    if (MOCK_RESPONSE_DELAY_MS > 0) await delay(MOCK_RESPONSE_DELAY_MS);

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
        const lowerInput = userInput.toLowerCase();
        if (lowerInput.includes('vender') || lowerInput.includes('comercializar')) {
          const productMatch = lowerInput.match(/(?:vender|comercializar)\s+(.+)/i);
          if (productMatch && productMatch[1]) {
            conv.structuredContext.objective = 'vender/comercializar';
            conv.structuredContext.productOrService = userInput.substring(productMatch.index! + productMatch[0].length - productMatch[1].length).trim();
          } else {
            conv.structuredContext.objective = userInput;
          }
        } else {
          conv.structuredContext.objective = userInput;
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
        conv.structuredContext.expectedResult = lastUserTurn?.content;
        content = 'Gracias por la información. Aquí tienes un resumen de lo que he entendido.';
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
    const assistantTurn = createTurn(conversationId, 'assistant', content, turnNumber);
    turns.push(assistantTurn);
    conversationTurns.set(conversationId, turns);

    if (nextStage === 'completed') {
       await this.completeConversation(conversationId);
    }

    return assistantTurn;
  }
}

export const growthConversationService = new GrowthConversationMockService();
export default growthConversationService;
