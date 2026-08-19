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
  describe,
  expect,
  it,
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
  setMockResponseDelay,
} from '../services/growthConversationMockService';

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
          };

        await submitAnswer(
          'Quiero vender Aura HCM',
        );

        await submitAnswer(
          'Hoteles',
        );

        await submitAnswer(
          'México',
        );

        await submitAnswer(
          'Incrementar ventas 20%',
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
        );

        await waitFor(() => {
          expect(
            screen.getByText(
              /llamado a la acción principal/i,
            ),
          ).toBeInTheDocument();
        });

        await submitAnswer(
          'Agendar una demostración',
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
