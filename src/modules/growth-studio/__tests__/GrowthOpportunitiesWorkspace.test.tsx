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

import { GrowthI18nProvider } from '../i18n/GrowthI18nProvider';

import GrowthOpportunitiesWorkspace from '../product/GrowthOpportunitiesWorkspace';

describe(
  'GrowthOpportunitiesWorkspace',
  () => {
    it('renders executive opportunity summary', () => {
      render(
        <GrowthI18nProvider>
          <GrowthOpportunitiesWorkspace />
        </GrowthI18nProvider>,
      );

      expect(
        screen.getByText(
          'Pipeline y potencial comercial',
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          'Pipeline activo',
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          'Alta prioridad',
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          'Score promedio',
        ),
      ).toBeInTheDocument();
    });

    it('shows prioritized opportunity intelligence', () => {
      render(
        <GrowthI18nProvider>
          <GrowthOpportunitiesWorkspace />
        </GrowthI18nProvider>,
      );

      expect(
        screen.getAllByText(
          'Grupo Nova',
        ).length,
      ).toBeGreaterThanOrEqual(2);

      expect(
        screen.getByText(
          'Aura recomienda',
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          'Confianza',
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          'Siguiente Mejor Acción',
        ),
      ).toBeInTheDocument();
    });

    it('filters opportunities by search query', () => {
      render(
        <GrowthI18nProvider>
          <GrowthOpportunitiesWorkspace />
        </GrowthI18nProvider>,
      );

      const search =
        screen.getByPlaceholderText(
          'Buscar prospecto o empresa',
        );

      fireEvent.change(
        search,
        {
          target: {
            value: 'Horizonte',
          },
        },
      );

      expect(
        screen.getByText(
          'Industrias Horizonte',
        ),
      ).toBeInTheDocument();

      expect(
        screen.queryByText(
          'Logística Delta',
        ),
      ).not.toBeInTheDocument();
    });

    it('filters opportunities by stage', () => {
      render(
        <GrowthI18nProvider>
          <GrowthOpportunitiesWorkspace />
        </GrowthI18nProvider>,
      );

      const stageFilter =
        screen.getByDisplayValue(
          'Todas las etapas',
        );

      fireEvent.change(
        stageFilter,
        {
          target: {
            value: 'proposal',
          },
        },
      );

      expect(
        screen.getByText(
          'Manufactura Axis',
        ),
      ).toBeInTheDocument();

      expect(
        screen.getAllByText(
          'Grupo Nova',
        ).length,
      ).toBe(1);
    });

    it('changes the intelligence detail when selecting another opportunity', () => {
      render(
        <GrowthI18nProvider>
          <GrowthOpportunitiesWorkspace />
        </GrowthI18nProvider>,
      );

      const horizon =
        screen.getByText(
          'Industrias Horizonte',
        );

      fireEvent.click(
        horizon.closest('button')!,
      );

      expect(
        screen.getAllByText(
          'Industrias Horizonte',
        ).length,
      ).toBeGreaterThan(0);

      expect(
        screen.getByText(
          'Carlos Méndez',
        ),
      ).toBeInTheDocument();
    });
  },
);
