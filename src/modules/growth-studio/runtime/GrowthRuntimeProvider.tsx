import {
  createContext,
  type ReactNode,
  useContext,
} from 'react';

import type { BusinessProfile } from '../types/businessProfile';
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
  businessProfile?: BusinessProfile;
  runtimeContext?:
    | AuraRuntimeContext
    | null;
}

export function GrowthRuntimeProvider({
  children,
  runtimeContext,
  businessProfile,
}: GrowthRuntimeProviderProps) {
  const runtime =
    useGrowthConversation(
      runtimeContext ?? undefined,
      businessProfile,
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
