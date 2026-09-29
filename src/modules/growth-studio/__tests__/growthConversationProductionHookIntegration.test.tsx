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

const commercialRepository = vi.hoisted(() => ({
  readEnterpriseContext: vi.fn(), readProductContexts: vi.fn(),
  createEnterpriseContext: vi.fn(), updateEnterpriseContext: vi.fn(),
  createProductContext: vi.fn(), updateProductContext: vi.fn(),
}));
vi.mock('../../../firebase', () => ({ db: {} }));
vi.mock('../services/growthCommercialContextRepository', () => ({
  createGrowthCommercialContextRepository: () => commercialRepository,
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
import type { EnterpriseCommercialContext, ProductContext } from '../types/growthCommercialContext';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function savedEnterprise(): EnterpriseCommercialContext {
  const missing = { value: null, status: 'missing' as const, confidence: 0, evidenceIds: [] };
  const known = (value: string) => ({ ...missing, value, status: 'confirmed' as const, confidence: 100 });
  return {
    id: 'enterprise-a', companyId: 'company-a', tenantId: 'tenant-z',
    companyName: known('Persisted Aura'), businessDescription: known('Persisted software'),
    industry: missing, valueProposition: missing, differentiators: missing, targetMarkets: missing,
    brandTone: missing, communicationStyle: missing, businessGoals: missing,
    evidence: [], status: 'active', completenessScore: 20, version: 1,
    createdAt: '2020-01-01T00:00:00Z', updatedAt: '2020-01-01T00:00:00Z',
  };
}

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
      commercialRepository.readEnterpriseContext.mockResolvedValue(null);
      commercialRepository.readProductContexts.mockResolvedValue([]);

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

    it('hydrates both reads before startConversation and performs no persistence writes', async () => {
      const company = deferred<EnterpriseCommercialContext | null>();
      const catalog = deferred<ProductContext[]>();
      commercialRepository.readEnterpriseContext.mockReturnValueOnce(company.promise);
      commercialRepository.readProductContexts.mockReturnValueOnce(catalog.promise);
      const { result } = renderHook(() => useGrowthConversation(TEST_RUNTIME));
      let pending!: Promise<void>;
      act(() => { pending = result.current.start(); });
      expect(productionService.startConversation).not.toHaveBeenCalled();
      await act(async () => { company.resolve(savedEnterprise()); await company.promise; });
      expect(productionService.startConversation).not.toHaveBeenCalled();
      await act(async () => { catalog.resolve([]); await pending; });
      expect(productionService.startConversation).toHaveBeenCalledWith(expect.objectContaining({
        userId: TEST_RUNTIME.userId, companyId: 'company-a', tenantId: 'tenant-a',
        businessProfile: expect.objectContaining({ companyName: expect.objectContaining({ value: 'Persisted Aura' }), products: [] }),
      }));
      expect(commercialRepository.readEnterpriseContext).toHaveBeenCalledWith({ companyId: 'company-a' });
      expect(commercialRepository.readProductContexts).toHaveBeenCalledWith({ companyId: 'company-a' });
      for (const write of [commercialRepository.createEnterpriseContext, commercialRepository.updateEnterpriseContext,
        commercialRepository.createProductContext, commercialRepository.updateProductContext]) expect(write).not.toHaveBeenCalled();
    });

    it('surfaces a repository error and never starts with an empty fallback profile', async () => {
      commercialRepository.readEnterpriseContext.mockRejectedValueOnce(new Error('permission-denied'));
      const { result } = renderHook(() => useGrowthConversation(TEST_RUNTIME));
      await act(async () => { await result.current.start(); });
      expect(result.current.error).toBe('permission-denied');
      expect(result.current.loading).toBe(false);
      expect(result.current.conversation).toBeNull();
      expect(productionService.startConversation).not.toHaveBeenCalled();
    });

    it.each(['companyId', 'userId'] as const)('discards old hydration on %s change even without a new start', async key => {
      const company = deferred<EnterpriseCommercialContext | null>();
      commercialRepository.readEnterpriseContext.mockReturnValueOnce(company.promise);
      const { result, rerender } = renderHook(({ runtime }) => useGrowthConversation(runtime), { initialProps: { runtime: TEST_RUNTIME } });
      let pending!: Promise<void>;
      act(() => { pending = result.current.start(); });
      rerender({ runtime: { ...TEST_RUNTIME, [key]: 'changed' } });
      await act(async () => { company.resolve(savedEnterprise()); await pending; });
      expect(productionService.startConversation).not.toHaveBeenCalled();
      expect(result.current.conversation).toBeNull();
      expect(result.current.turns).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('a repeated start wins over an earlier hydration and its late error', async () => {
      const first = deferred<EnterpriseCommercialContext | null>();
      commercialRepository.readEnterpriseContext.mockReturnValueOnce(first.promise);
      const { result } = renderHook(() => useGrowthConversation(TEST_RUNTIME));
      let pending!: Promise<void>;
      act(() => { pending = result.current.start(); });
      await act(async () => { await result.current.start(); });
      await act(async () => { first.reject(new Error('old failure')); await pending; });
      expect(productionService.startConversation).toHaveBeenCalledTimes(1);
      expect(result.current.conversation?.id).toBe(conversation.id);
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('discards a conversation that finishes starting after scope changes', async () => {
      const started = deferred<typeof conversation>();
      productionService.startConversation.mockReturnValueOnce(started.promise);
      const { result, rerender } = renderHook(({ runtime }) => useGrowthConversation(runtime), { initialProps: { runtime: TEST_RUNTIME } });
      let pending!: Promise<void>;
      act(() => { pending = result.current.start(); });
      await waitFor(() => expect(productionService.startConversation).toHaveBeenCalledTimes(1));
      rerender({ runtime: { ...TEST_RUNTIME, companyId: 'company-b' } });
      await act(async () => { started.resolve(conversation); await pending; });
      expect(productionService.getConversationTurns).not.toHaveBeenCalled();
      expect(result.current.conversation).toBeNull();
    });

    it('does not start a session when unmounted during hydration', async () => {
      const first = deferred<EnterpriseCommercialContext | null>();
      commercialRepository.readEnterpriseContext.mockReturnValueOnce(first.promise);
      const { result, unmount } = renderHook(() => useGrowthConversation(TEST_RUNTIME));
      let pending!: Promise<void>;
      act(() => { pending = result.current.start(); });
      unmount();
      await act(async () => { first.resolve(savedEnterprise()); await pending; });
      expect(productionService.startConversation).not.toHaveBeenCalled();
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
