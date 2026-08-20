import {
  render,
  screen,
} from '@testing-library/react';

import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  GrowthRuntimeProvider,
  useGrowthRuntime,
} from '../runtime/GrowthRuntimeProvider';

function RuntimeProbe() {
  const runtime =
    useGrowthRuntime();

  return (
    <div>
      <span>
        {runtime.conversation
          ? 'conversation-present'
          : 'conversation-empty'}
      </span>

      <span>
        {runtime.campaignStrategy
          ? 'strategy-present'
          : 'strategy-empty'}
      </span>
    </div>
  );
}

describe(
  'GrowthRuntimeProvider',
  () => {
    it('provides one Growth runtime authority to descendants', () => {
      render(
        <GrowthRuntimeProvider>
          <RuntimeProbe />
        </GrowthRuntimeProvider>,
      );

      expect(
        screen.getByText(
          'conversation-empty',
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          'strategy-empty',
        ),
      ).toBeInTheDocument();
    });

    it('fails closed outside the provider', () => {
      expect(() =>
        render(<RuntimeProbe />),
      ).toThrow(
        'useGrowthRuntime must be used within GrowthRuntimeProvider',
      );
    });
  },
);
