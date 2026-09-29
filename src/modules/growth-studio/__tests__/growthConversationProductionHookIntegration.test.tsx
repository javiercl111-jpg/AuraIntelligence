import { TEST_RUNTIME, knownBusinessProfile } from './businessProfileFixtures';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const productionService = vi.hoisted(() => ({
  startConversation: vi.fn(),
  getConversationTurns: vi.fn(),
  addTurn: vi.fn(),
  generateAssistantResponse: vi.fn(),
  getConversation: vi.fn(),
}));

vi.mock(
  '../services/growthConversationProductionService',
  () => ({
    growthConversationService:
      productionService,
  }),
);

import {
  GrowthRuntimeProvider,
  useGrowthRuntime,
} from '../runtime/GrowthRuntimeProvider';
import { useGrowthConversation } from '../hooks/useGrowthConversation';

const NOW =
  '2026-09-18T00:00:00.000Z';

const sharedStructuredContext:
  Record<string, unknown> = {
    additionalData: {
      companyName: 'Aura Nexus',
    },
  };

const conversation = {
  id: 'conv-production-hook-test',
  tenantId: 'tenant-a',
  companyId: 'company-a',
  userId: 'user-a',
  objectiveId: null,
  status: 'active',
  currentStage:
    'understanding_product',
  structuredContext:
    sharedStructuredContext,
  schemaVersion: 1,
  createdAt: NOW,
  updatedAt: NOW,
};

const welcomeTurn = {
  id: 'turn-1',
  conversationId: conversation.id,
  role: 'assistant',
  content: '¿Qué función desempeñas en tu empresa?',
  turnNumber: 1,
  createdAt: NOW,
};

const userTurn = {
  id: 'turn-2',
  conversationId: conversation.id,
  role: 'user',
  content: 'Necesitamos crecer ventas',
  turnNumber: 2,
  createdAt: NOW,
};

const assistantTurn = {
  id: 'turn-3',
  conversationId: conversation.id,
  role: 'assistant',
  content:
    '¿Qué obstáculo limita hoy el crecimiento comercial?',
  turnNumber: 3,
  createdAt: NOW,
};

function RuntimeProbe() {
  const runtime =
    useGrowthRuntime();

  return (
    <>
      <div data-testid="conversation-id">
        {runtime.conversation?.id ??
          'conversation-empty'}
      </div>

      <div data-testid="first-turn-content">
        {runtime.turns[0]?.content ??
          'turn-empty'}
      </div>

      <button
        type="button"
        onClick={() => {
          void runtime.start();
        }}
      >
        start
      </button>

      <button
        type="button"
        onClick={() => {
          void runtime.addTurn(
            'Necesitamos crecer ventas',
          );
        }}
      >
        add-turn
      </button>
    </>
  );
}

function renderRuntime() {
  return render(
    <GrowthRuntimeProvider runtimeContext={TEST_RUNTIME} businessProfile={knownBusinessProfile()}>
      <RuntimeProbe />
    </GrowthRuntimeProvider>,
  );
}

describe(
  'Growth production hook integration',
  () => {
    afterEach(() => {
      cleanup();
    });

    beforeEach(() => {
      vi.resetAllMocks();

      for (
        const key of
          Object.keys(
            sharedStructuredContext,
          )
      ) {
        delete sharedStructuredContext[key];
      }

      sharedStructuredContext.additionalData = {
        companyName: 'Aura Nexus',
      };

      productionService
        .startConversation
        .mockResolvedValue(
          conversation,
        );

      productionService
        .getConversationTurns
        .mockResolvedValueOnce([
          welcomeTurn,
        ])
        .mockResolvedValueOnce([
          welcomeTurn,
          userTurn,
        ])
        .mockResolvedValueOnce([
          welcomeTurn,
          userTurn,
          assistantTurn,
        ]);

      productionService
        .addTurn
        .mockResolvedValue(
          userTurn,
        );

      productionService
        .generateAssistantResponse
        .mockResolvedValue(
          assistantTurn,
        );

      productionService
        .getConversation
        .mockResolvedValue({
          ...conversation,
          currentStage:
            'understanding_product',
          structuredContext:
            sharedStructuredContext,
        });
    });

    it('rejects blank and simultaneous submissions, then releases the lock', async () => {
      const { result } = renderHook(() => useGrowthConversation(TEST_RUNTIME));
      await act(async () => { await result.current.start(); });
      await act(async () => {
        await result.current.addTurn('   ');
      });
      expect(productionService.addTurn).not.toHaveBeenCalled();
      await act(async () => {
        await Promise.all([
          result.current.addTurn('Javier'), result.current.addTurn('Javier'),
        ]);
      });
      expect(productionService.addTurn).toHaveBeenCalledTimes(1);
      expect(productionService.generateAssistantResponse).toHaveBeenCalledTimes(1);
      expect(result.current.isTyping).toBe(false);
      productionService.getConversationTurns.mockResolvedValue([welcomeTurn]);
      await act(async () => { await result.current.addTurn('Director'); });
      expect(productionService.addTurn).toHaveBeenCalledTimes(2);
    });

    it(
      'CASE1 routes start through production singleton and preserves shared structuredContext',
      async () => {
        renderRuntime();

        fireEvent.click(
          screen.getByRole(
            'button',
            { name: 'start' },
          ),
        );

        await waitFor(() => {
          expect(
            productionService
              .startConversation,
          ).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(
            screen.getByTestId(
              'conversation-id',
            ).textContent,
          ).toBe(
            conversation.id,
          );
        });

        expect(
          productionService
            .getConversationTurns,
        ).toHaveBeenCalledWith(
          conversation.id,
        );

        expect(
          screen.getByTestId(
            'first-turn-content',
          ).textContent,
        ).toContain(
          '¿Qué función desempeñas en tu empresa?',
        );

        expect(
          conversation.structuredContext,
        ).toBe(
          sharedStructuredContext,
        );

        expect(
          (
            sharedStructuredContext
              .additionalData as
              Record<string, unknown>
          ).companyName,
        ).toBe(
          'Aura Nexus',
        );
      },
    );

    it(
      'CASE2 routes addTurn lifecycle through production singleton',
      async () => {
        renderRuntime();

        fireEvent.click(
          screen.getByRole(
            'button',
            { name: 'start' },
          ),
        );

        await waitFor(() => {
          expect(
            productionService
              .startConversation,
          ).toHaveBeenCalledTimes(1);
        });

        fireEvent.click(
          screen.getByRole(
            'button',
            { name: 'add-turn' },
          ),
        );

        await waitFor(() => {
          expect(
            productionService.addTurn,
          ).toHaveBeenCalledWith(
            expect.objectContaining({
              conversationId:
                conversation.id,
              role: 'user',
              content:
                'Necesitamos crecer ventas',
            }),
          );
        });

        await waitFor(() => {
          expect(
            productionService
              .generateAssistantResponse,
          ).toHaveBeenCalledWith(
            conversation.id,
          );
        });

        await waitFor(() => {
          expect(
            productionService
              .getConversation,
          ).toHaveBeenCalledWith(
            conversation.id,
          );
        });

        expect(
          productionService
            .getConversationTurns,
        ).toHaveBeenCalledTimes(3);
      },
    );
  },
);
