import {
  createContext,
  type ReactNode,
  useContext,
} from 'react';

import type { AuraRuntimeContext } from '../../../types/auraContext';

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
  runtimeContext?:
    | AuraRuntimeContext
    | null;
}

export function GrowthRuntimeProvider({
  children,
  runtimeContext,
}: GrowthRuntimeProviderProps) {
  const runtime =
    useGrowthConversation(
      runtimeContext ?? undefined,
    );

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
