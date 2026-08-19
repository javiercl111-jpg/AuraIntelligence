import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  GrowthI18nProvider,
} from '../i18n/GrowthI18nProvider';

import { GrowthRuntimeProvider } from '../runtime/GrowthRuntimeProvider';

import GrowthCampaignsWorkspace from '../product/GrowthCampaignsWorkspace';

describe(
  'GrowthCampaignsWorkspace',
  () => {
    it('fails closed when no campaign strategy exists', () => {
      render(
        <GrowthI18nProvider>
          <GrowthRuntimeProvider>
            <GrowthCampaignsWorkspace />
          </GrowthRuntimeProvider>
        </GrowthI18nProvider>,
      );

      expect(
        screen.getByText(
          'Portafolio de campañas',
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          'Aún no existe una estrategia de campaña',
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          /Completa el contexto estratégico en Growth Advisor/i,
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          'Abrir Growth Advisor',
        ),
      ).toBeInTheDocument();

      expect(
        screen.queryByText(
          'Preparación',
        ),
      ).not.toBeInTheDocument();

      expect(
        screen.queryByText(
          'Estrategia de campaña',
        ),
      ).not.toBeInTheDocument();
    });

    it('does not expose unsupported launch claims', () => {
      render(
        <GrowthI18nProvider>
          <GrowthRuntimeProvider>
            <GrowthCampaignsWorkspace />
          </GrowthRuntimeProvider>
        </GrowthI18nProvider>,
      );

      expect(
        screen.queryByText(
          /campaña lanzada/i,
        ),
      ).not.toBeInTheDocument();

      expect(
        screen.queryByText(
          /campaign launched/i,
        ),
      ).not.toBeInTheDocument();
    });

    it('opens Growth Advisor from the empty campaign state', () => {
      let opened = false;

      render(
        <GrowthI18nProvider>
          <GrowthRuntimeProvider>
            <GrowthCampaignsWorkspace
              onOpenAdvisor={() => {
                opened = true;
              }}
            />
          </GrowthRuntimeProvider>
        </GrowthI18nProvider>,
      );

      fireEvent.click(
        screen.getByRole(
          'button',
          {
            name: 'Abrir Growth Advisor',
          },
        ),
      );

      expect(opened).toBe(true);
    });  },
);
