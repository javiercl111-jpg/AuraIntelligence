import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const firebaseState = vi.hoisted(() => ({
  currentUser: null as unknown,
}));

vi.mock('../../../firebase', () => ({
  auth: firebaseState,
}));

import {
  GrowthConversationProductionService,
} from '../services/growthConversationProductionService';

const ENDPOINT =
  'https://preview.example.test/growth-advisor';

const ID_TOKEN =
  'firebase-id-token-test';

const USER_RESPONSE =
  'Nuestro principal obstaculo es convertir oportunidades en ventas.';

const SERVER_QUESTION =
  '¿Qué parte del proceso comercial pierde más oportunidades?';

const fetchMock = vi.fn();

function successfulResponse(
  nextQuestion = SERVER_QUESTION,
): Response {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({
      ok: true,
      conversationProposal: {
        nextQuestion,
      },
    }),
  } as unknown as Response;
}

function failedResponse(
  status: number,
  code: string,
): Response {
  return {
    ok: false,
    status,
    json: vi.fn().mockResolvedValue({
      ok: false,
      error: {
        code,
      },
    }),
  } as unknown as Response;
}

async function seedConversation(
  service: GrowthConversationProductionService,
) {
  const conversation = await service.startConversation({
    userId: 'growth-test-user',
    companyId: 'aura_root',
    companyName: 'Aura Nexus',
    industry: 'Technology',
    objective: 'Increase commercial growth',
    initialMessage: 'We need a better growth strategy',
  } as never);

  Object.assign(
    conversation.structuredContext,
    {
      additionalData: {
        companyName: 'Aura Nexus',
        industry: 'Technology',
      },
    },
  );

  await service.addTurn({
    conversationId: conversation.id,
    role: 'user',
    content: USER_RESPONSE,
  } as never);

  return conversation;
}

function parseOutboundBody(): Record<string, unknown> {
  expect(fetchMock).toHaveBeenCalledTimes(1);

  const call =
    fetchMock.mock.calls[0];

  const init =
    call[1] as RequestInit;

  expect(typeof init.body).toBe('string');

  return JSON.parse(
    init.body as string,
  ) as Record<string, unknown>;
}

describe(
  'GrowthConversationProductionService',
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      vi.stubEnv(
        'VITE_GROWTH_ADVISOR_BRIDGE_URL',
        ENDPOINT,
      );

      firebaseState.currentUser = {
        getIdToken: vi.fn().mockResolvedValue(ID_TOKEN),
      };

      fetchMock.mockResolvedValue(
        successfulResponse(),
      );

      vi.stubGlobal(
        'fetch',
        fetchMock,
      );
    });

    afterEach(() => {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
    });

    it(
      'CASE1 fails closed when endpoint is missing',
      async () => {
        vi.stubEnv(
          'VITE_GROWTH_ADVISOR_BRIDGE_URL',
          '',
        );

        const service =
          new GrowthConversationProductionService();

        const conversation =
          await seedConversation(service);

        await expect(
          service.generateAssistantResponse(
            conversation.id,
          ),
        ).rejects.toThrow(
          'GROWTH_ADVISOR_BRIDGE_URL_NOT_CONFIGURED',
        );

        expect(fetchMock).not.toHaveBeenCalled();
      },
    );

    it(
      'CASE2 fails closed when Firebase user is missing',
      async () => {
        firebaseState.currentUser = null;

        const service =
          new GrowthConversationProductionService();

        const conversation =
          await seedConversation(service);

        await expect(
          service.generateAssistantResponse(
            conversation.id,
          ),
        ).rejects.toThrow(
          'GROWTH_ADVISOR_AUTH_REQUIRED',
        );

        expect(fetchMock).not.toHaveBeenCalled();
      },
    );

    it(
      'CASE3 sends Firebase ID token as Bearer authorization',
      async () => {
        const service =
          new GrowthConversationProductionService();

        const conversation =
          await seedConversation(service);

        await service.generateAssistantResponse(
          conversation.id,
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);

        const [
          url,
          init,
        ] =
          fetchMock.mock.calls[0] as [
            string,
            RequestInit,
          ];

        expect(url).toBe(ENDPOINT);

        expect(init.method).toBe('POST');

        expect(init.headers).toMatchObject({
          Authorization:
            `Bearer ${ID_TOKEN}`,
          'Content-Type':
            'application/json',
        });
      },
    );

    it(
      'CASE4 sends only the required conversation payload contract',
      async () => {
        const service =
          new GrowthConversationProductionService();

        const conversation =
          await seedConversation(service);

        await service.generateAssistantResponse(
          conversation.id,
        );

        const body =
          parseOutboundBody();

        expect(
          Object.keys(body).sort(),
        ).toEqual(
          [
            'advisoryObjective',
            'askedQuestions',
            'canonicalHypothesis',
            'companyName',
            'confidenceLevel',
            'confirmedFacts',
            'conversationHistory',
            'criticalMissingInformation',
            'currentResponse',
            'industry',
            'pendingHypotheses',
          ].sort(),
        );

        expect(body.companyName).toBe(
          'Aura Nexus',
        );

        expect(body.industry).toBe(
          'Technology',
        );

        expect(body.currentResponse).toBe(
          USER_RESPONSE,
        );

        expect(
          body.conversationHistory,
        ).toBeInstanceOf(Array);
      },
    );

    it(
      'CASE5 never sends client authority fields in the outbound body',
      async () => {
        const service =
          new GrowthConversationProductionService();

        const conversation =
          await seedConversation(service);

        await service.generateAssistantResponse(
          conversation.id,
        );

        const body =
          parseOutboundBody();

        for (
          const forbidden of [
            'uid',
            'tenantId',
            'principalId',
            'claims',
            'capability',
            'sessionToken',
            'token',
          ]
        ) {
          expect(
            Object.prototype.hasOwnProperty.call(
              body,
              forbidden,
            ),
          ).toBe(false);
        }
      },
    );

    it(
      'CASE6 maps server nextQuestion into the local assistant turn',
      async () => {
        const service =
          new GrowthConversationProductionService();

        const conversation =
          await seedConversation(service);

        const assistantTurn =
          await service.generateAssistantResponse(
            conversation.id,
          );

        expect(assistantTurn.role).toBe(
          'assistant',
        );

        expect(assistantTurn.content).toBe(
          SERVER_QUESTION,
        );
      },
    );

    it(
      'CASE7 fails closed with the server error code',
      async () => {
        fetchMock.mockResolvedValue(
          failedResponse(
            403,
            'CAPABILITY_DENIED',
          ),
        );

        const service =
          new GrowthConversationProductionService();

        const conversation =
          await seedConversation(service);

        await expect(
          service.generateAssistantResponse(
            conversation.id,
          ),
        ).rejects.toThrow(
          'GROWTH_ADVISOR_BRIDGE_ERROR:CAPABILITY_DENIED',
        );
      },
    );

    it(
      'CASE8 fails closed when the server response lacks nextQuestion',
      async () => {
        fetchMock.mockResolvedValue({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({
            ok: true,
            conversationProposal: {},
          }),
        } as unknown as Response);

        const service =
          new GrowthConversationProductionService();

        const conversation =
          await seedConversation(service);

        await expect(
          service.generateAssistantResponse(
            conversation.id,
          ),
        ).rejects.toThrow(
          'GROWTH_ADVISOR_NEXT_QUESTION_MISSING',
        );
      },
    );

    it(
      'CASE9 persists the generated assistant turn in local conversation state',
      async () => {
        const service =
          new GrowthConversationProductionService();

        const conversation =
          await seedConversation(service);

        const assistantTurn =
          await service.generateAssistantResponse(
            conversation.id,
          );

        const turns =
          await service.getConversationTurns(
            conversation.id,
          );

        expect(
          turns.some(
            (turn) =>
              turn.id === assistantTurn.id &&
              turn.role === 'assistant' &&
              turn.content === SERVER_QUESTION,
          ),
        ).toBe(true);
      },
    );

    it(
      'CASE10 preserves local stage progression before remote content replacement',
      async () => {
        const service =
          new GrowthConversationProductionService();

        const advanceStageSpy =
          vi.spyOn(
            service,
            'advanceStage',
          );

        const conversation =
          await seedConversation(service);

        await service.generateAssistantResponse(
          conversation.id,
        );

        expect(
          advanceStageSpy,
        ).toHaveBeenCalled();

        const persisted =
          await service.getConversation(
            conversation.id,
          );

        expect(persisted).not.toBeNull();

        expect(
          persisted?.currentStage,
        ).toBeDefined();
      },
    );
  },
);