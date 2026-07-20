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
      case 'understanding_objective':
        conv.structuredContext.objective = lastUserTurn?.content;
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
        // Rule: After executive_reflection, ask for confirmation
        const userMsg = lastUserTurn?.content.toLowerCase() || '';
        if (userMsg.includes('sí') || userMsg.includes('correcto') || userMsg.includes('si')) {
          content = '¡Excelente! Generando la propuesta preliminar...';
          nextStage = 'executive_proposal';
        } else {
          content = 'De acuerdo, por favor indícame qué parte deseas corregir (objetivo, audiencia, región o resultado).';
          // Stay in executive_reflection stage for correction loop
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
