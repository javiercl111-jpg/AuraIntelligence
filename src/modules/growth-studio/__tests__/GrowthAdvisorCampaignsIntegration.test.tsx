import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  useState,
} from 'react';
import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import ExecutiveConversationPage from '../components/ExecutiveConversationPage';
import {
  GrowthI18nProvider,
} from '../i18n/GrowthI18nProvider';
import GrowthCampaignsWorkspace from '../product/GrowthCampaignsWorkspace';
import {
  GrowthRuntimeProvider,
} from '../runtime/GrowthRuntimeProvider';
import {
  setProductionResponseDelay as setMockResponseDelay,
} from '../services/growthConversationProductionService';

vi.mock('../../../firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue(
        'test-growth-advisor-id-token',
      ),
    },
  },
}));
const TEST_BRIDGE_URL = 'test-local://growth-advisor';

const growthAdvisorFetchMock = vi.fn(
  async (
    _input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const body =
      typeof init?.body === 'string'
        ? JSON.parse(init.body)
        : {};

    const askedQuestions =
      Array.isArray(body.askedQuestions)
        ? body.askedQuestions
        : [];

    const questions: Record<number, string> = {
      1: '¿Qué producto, servicio o línea de negocio quieres impulsar?',
      2: '¿A qué audiencia o segmento deseas llegar?',
      3: '¿En qué región o mercado quieres concentrar esta estrategia?',
      4: '¿En qué canales o medios quieres desarrollar esta estrategia?',
      5: '¿Qué acción quieres que realice la audiencia después de ver el contenido?',
      6: '¿Hay alguna consideración adicional que debamos tomar en cuenta?',
    };

    const nextQuestion =
      questions[askedQuestions.length] ??
      '¿Hay alguna consideración adicional que debamos tomar en cuenta?';

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
  },
);

function SharedRuntimeJourney() {
  const [
    surface,
    setSurface,
  ] = useState<
    'advisor' | 'campaigns'
  >('advisor');

  return (
    <GrowthI18nProvider>
      <GrowthRuntimeProvider>
        {surface === 'advisor' ? (
          <ExecutiveConversationPage
            onClose={() =>
              setSurface('campaigns')
            }
          />
        ) : (
          <GrowthCampaignsWorkspace />
        )}

        <button
          type="button"
          onClick={() =>
            setSurface('campaigns')
          }
        >
          Open Campaigns Test Surface
        </button>
      </GrowthRuntimeProvider>
    </GrowthI18nProvider>
  );
}

describe(
  'Growth Advisor to Campaigns shared runtime',
  () => {
    beforeEach(() => {
      setMockResponseDelay(0);
      vi.stubEnv('VITE_GROWTH_ADVISOR_BRIDGE_URL', TEST_BRIDGE_URL);
      vi.stubGlobal('fetch', growthAdvisorFetchMock);
      growthAdvisorFetchMock.mockClear();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
    });

    it(
      'preserves the generated CampaignStrategy when navigating from Advisor to Campaigns',
      async () => {
        render(
          <SharedRuntimeJourney />,
        );

        await waitFor(() => {
          expect(
            screen.getByPlaceholderText(
              'Escribe tu respuesta...',
            ),
          ).toBeInTheDocument();

          expect(
            screen.getByText(
              /producto, servicio o línea de negocio quieres impulsar/i,
            ),
          ).toBeInTheDocument();
        });

        const input =
          screen.getByPlaceholderText(
            'Escribe tu respuesta...',
          );

        const submit =
          screen.getByRole(
            'button',
            { name: /enviar/i },
          );

        const submitAnswer =
          async (
            value: string,
            expectedQuestion: RegExp,
          ) => {
            await waitFor(() => {
              expect(
                input,
              ).not.toBeDisabled();
            });

            fireEvent.change(
              input,
              {
                target: {
                  value,
                },
              },
            );

            fireEvent.click(
              submit,
            );

            await waitFor(() => {
              expect(
                screen.getByText(
                  expectedQuestion,
                ),
              ).toBeInTheDocument();
            });
          };

        await submitAnswer(
          'Quiero vender Aura HCM',
          /audiencia o segmento deseas llegar/i,
        );

        await submitAnswer(
          'Hoteles',
          /región o mercado quieres concentrar esta estrategia/i,
        );

        await submitAnswer(
          'México',
          /resultado|objetivo/i,
        );

        await submitAnswer(
          'Incrementar ventas 20%',
          /canales o medios/i,
        );
        await waitFor(() => {
          expect(
            screen.getByText(
              /canales o medios/i,
            ),
          ).toBeInTheDocument();
        });

        await submitAnswer(
          'LinkedIn, Email',
          /acción quieres que realice la audiencia después de ver el contenido/i,
        );

        await waitFor(() => {
          expect(
            screen.getByText(
              /acción quieres que realice la audiencia después de ver el contenido/i,
            ),
          ).toBeInTheDocument();
        });

        await submitAnswer(
          'Agendar una demostración',
          /^Objetivo de Crecimiento$/i,
        );

        await waitFor(() => {
          expect(
            screen.getAllByText(
              /Objetivo de Crecimiento/i,
            ).length,
          ).toBeGreaterThan(0);
        });

        await waitFor(() => {
          expect(
            screen.getByRole('heading', { name: /Memoria de Identidad/i, level: 3 }),
          ).toBeInTheDocument();
        });

        await submitAnswer(
          'sí, es correcto',
          /Propuesta preliminar de demostración/i,
        );

        await waitFor(() => {
          expect(
            screen.getByText(
              /Propuesta preliminar de demostración/i,
            ),
          ).toBeInTheDocument();
        });

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                'Open Campaigns Test Surface',
            },
          ),
        );

        await waitFor(() => {
          expect(
            screen.queryByText(
              'Aún no existe una estrategia de campaña',
            ),
          ).not.toBeInTheDocument();
        });

        expect(
          screen.getByText(
            'Preparación',
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            'Evidencia',
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            'Estrategia de campaña',
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            'Objetivo',
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            'Audiencia principal',
          ),
        ).toBeInTheDocument();
        expect(
          screen.getByText(
            'LinkedIn · Email',
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            'Agendar una demostración',
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            'Mensaje central',
          ),
        ).toBeInTheDocument();
      },
    );
  },
);
