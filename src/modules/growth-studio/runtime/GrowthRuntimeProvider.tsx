import {
  createContext,
  type ReactNode,
  useContext,
} from 'react';

import type {
  AuraIntelligenceContext,
} from '../../../types/auraIntelligence';

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
  context?: AuraIntelligenceContext;
  companyName?: string;
}

export function GrowthRuntimeProvider({
  children,
  context,
  companyName,
}: GrowthRuntimeProviderProps) {
  const runtime =
    useGrowthConversation({
      context,
      companyName,
    });

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
