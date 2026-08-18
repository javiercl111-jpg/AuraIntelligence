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
      screen.getByText('Executive Overview'),
    ).toBeTruthy();

    expect(
      screen.getByAltText('Aura').getAttribute('src'),
    ).toBe('/brand/aura-logo-official.png');
  });

  it('renders the complete Growth product navigation', () => {
    render(<GrowthStudioEntry />);

    expect(screen.getByText('Overview')).toBeTruthy();
    expect(screen.getAllByText('Opportunities').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Campaigns').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Intelligence').length).toBeGreaterThan(0);
    expect(screen.getByText('Content & Execution')).toBeTruthy();
    expect(screen.getAllByText('Performance').length).toBeGreaterThan(0);
    expect(screen.getByText('Growth Advisor')).toBeTruthy();
    expect(screen.getByText('Team & Users')).toBeTruthy();
    expect(screen.getByText('Notifications')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
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
      screen.getByText('Executive Overview'),
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
        name: /^opportunitiespipeline y potencial$/i,
      }),
    );

    expect(
      screen.getByText('Growth Opportunities'),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', {
        name: /^settings/i,
      }),
    );

    expect(
      screen.getByText(
        'Configura empresa, objetivos, canales, Intelligence y seguridad.',
      ),
    ).toBeTruthy();
  });
});
