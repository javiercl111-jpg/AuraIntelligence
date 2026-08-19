import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import GrowthStudioEntry from '../components/GrowthStudioEntry';

vi.mock(
  '../components/ExecutiveConversationPage',
  () => ({
    default: ({
      onClose,
    }: {
      onClose: () => void;
    }) => (
      <div data-testid="growth-advisor">
        <span>Executive Growth Conversation</span>

        <button
          type="button"
          onClick={onClose}
        >
          Close Advisor
        </button>
      </div>
    ),
  }),
);

describe('GrowthStudioEntry', () => {
  it('renders Aura Growth with Executive Overview by default', () => {
    const { container } = render(
      <GrowthStudioEntry />,
    );

    expect(
      container.querySelector('#growth-studio-entry'),
    ).toBeTruthy();

    expect(
      container.querySelector('#growth-executive-overview'),
    ).toBeTruthy();

    expect(
      screen.getByText('Resumen Ejecutivo'),
    ).toBeTruthy();

    expect(
      screen.getByAltText('Aura').getAttribute('src'),
    ).toBe('/brand/aura-logo-official.png');
  });

  it('renders the complete Growth product navigation', () => {
    render(<GrowthStudioEntry />);

    expect(screen.getByText('Resumen')).toBeTruthy();
    expect(screen.getAllByText('Oportunidades').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Campañas').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inteligencia').length).toBeGreaterThan(0);
    expect(screen.getByText('Contenido y Ejecución')).toBeTruthy();
    expect(screen.getAllByText('Rendimiento').length).toBeGreaterThan(0);
    expect(screen.getByText('Growth Advisor')).toBeTruthy();
    expect(screen.getByText('Equipo y Usuarios')).toBeTruthy();
    expect(screen.getByText('Notificaciones')).toBeTruthy();
    expect(screen.getByText('Configuración')).toBeTruthy();
  });

  it('does not expose the obsolete provisional presentation', () => {
    render(<GrowthStudioEntry />);

    expect(
      screen.queryByText('Launch Edition'),
    ).toBeNull();

    expect(
      screen.queryByText('Foundation in progress'),
    ).toBeNull();
  });

  it('opens Growth Advisor from the executive overview', () => {
    render(<GrowthStudioEntry />);

    fireEvent.click(
      screen.getByRole('button', {
        name: /abrir growth advisor/i,
      }),
    );

    expect(
      screen.getByTestId('growth-advisor'),
    ).toBeTruthy();

    expect(
      screen.getAllByText('Growth Advisor').length,
    ).toBeTruthy();
  });

  it('returns from Growth Advisor to Executive Overview', () => {
    render(<GrowthStudioEntry />);

    fireEvent.click(
      screen.getByRole('button', {
        name: /abrir growth advisor/i,
      }),
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Close Advisor',
      }),
    );

    expect(
      screen.getByText('Resumen Ejecutivo'),
    ).toBeTruthy();

    expect(
      document.querySelector(
        '#growth-executive-overview',
      ),
    ).toBeTruthy();
  });

  it('navigates to structured product sections', () => {
    render(<GrowthStudioEntry />);

    fireEvent.click(
      screen.getByRole('button', {
        name: /^oportunidadespipeline y potencial$/i,
      }),
    );

    expect(
      screen.getByText('Oportunidades de Crecimiento'),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', {
        name: /^configuración/i,
      }),
    );

    expect(
      screen.getAllByText(
        'Empresa, canales y permisos',
      ).length,
    ).toBeGreaterThanOrEqual(2);
  });
});
