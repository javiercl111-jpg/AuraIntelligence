import {
  createContext,
  type ReactNode,
  useContext,
} from 'react';

import {
  useGrowthConversation,
} from '../hooks/useGrowthConversation';

type GrowthRuntime =
  ReturnType<typeof useGrowthConversation>;

const GrowthRuntimeContext =
  createContext<GrowthRuntime | null>(
    null,
  );

interface GrowthRuntimeProviderProps {
  children: ReactNode;
}

export function GrowthRuntimeProvider({
  children,
}: GrowthRuntimeProviderProps) {
  const runtime =
    useGrowthConversation();

  return (
    <GrowthRuntimeContext.Provider
      value={runtime}
    >
      {children}
    </GrowthRuntimeContext.Provider>
  );
}

export function useGrowthRuntime(): GrowthRuntime {
  const runtime =
    useContext(GrowthRuntimeContext);

  if (!runtime) {
    throw new Error(
      'useGrowthRuntime must be used within GrowthRuntimeProvider',
    );
  }

  return runtime;
}
