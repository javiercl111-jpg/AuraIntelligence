import React, {
  useEffect,
  useState,
} from 'react';

import {
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';

import { auth } from './firebase';

import type {
  AuraIntelligenceContext,
} from './types/auraIntelligence';

import {
  seedDefaultArticles,
} from './services/auraKnowledgeAdminService';

import ExecutiveWorkspace from './components/ExecutiveWorkspace';
import AuraIntelligenceLogin from './components/AuraIntelligenceLogin';
import AuraAssistantWidget from './components/AuraAssistantWidget';

import GrowthStudioEntry from './modules/growth-studio/components/GrowthStudioEntry';
import AuraGrowthLogin from './modules/growth-studio/product/AuraGrowthLogin';

import {
  getDevelopmentProductSurface,
} from './productSurface';

import {
  getGrowthPreviewAccess,
} from './growthPreviewAccess';

const buildDemoContext = (
  userEmail?: string | null,
): AuraIntelligenceContext => ({
  tenantId: 'aura_demo',
  companyId: 'aura_demo',
  userId:
    auth.currentUser?.uid ||
    'demo_admin',
  userEmail:
    userEmail ||
    auth.currentUser?.email ||
    'admin@aura.demo',
  userName:
    auth.currentUser?.displayName ||
    'Administrador Aura',
  role: 'SUPER_ADMIN',
  profileId: 'super-admin',
  permissions: [
    'aura_intelligence:read',
    'aura_intelligence:admin',
  ],
  system: 'aura_hcm',
  module: 'payroll',
  route: '/',
  language: 'es',
});

const App: React.FC = () => {
  const productSurface =
    getDevelopmentProductSurface();

  const isGrowthSurface =
    productSurface === 'growth';

  const hasLocalGrowthPreviewAccess =
    getGrowthPreviewAccess();

  const [isAuthReady, setIsAuthReady] =
    useState(false);

  const [
    isAuthenticated,
    setIsAuthenticated,
  ] = useState(false);

  const [
    context,
    setContext,
  ] = useState<AuraIntelligenceContext>(
    buildDemoContext(),
  );

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (firebaseUser) => {
          setIsAuthenticated(
            Boolean(firebaseUser),
          );

          if (!isGrowthSurface) {
            setContext(
              buildDemoContext(
                firebaseUser?.email ||
                  null,
              ),
            );
          }

          setIsAuthReady(true);
        },
      );

    return () => unsubscribe();
  }, [isGrowthSurface]);

  useEffect(() => {
    if (isGrowthSurface) {
      return;
    }

    const runSeed = async () => {
      try {
        await seedDefaultArticles();
      } catch (error) {
        console.error(
          '[Aura Intelligence] Error al sembrar los artÃ­culos de conocimiento por defecto:',
          error,
        );
      }
    };

    void runSeed();
  }, [isGrowthSurface]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (productSurface === 'invalid') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07111f] px-6 text-white">
        <section className="w-full max-w-xl rounded-3xl border border-red-400/20 bg-white/[0.035] p-8 text-center shadow-2xl shadow-black/30 backdrop-blur-xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-red-300">
            Aura Nexus
          </p>

          <h1 className="mt-4 text-2xl font-black tracking-tight">
            Configuración de producto no válida
          </h1>

          <p className="mt-4 text-sm leading-6 text-white/55">
            Esta dirección no está autorizada para abrir una superficie de producto Aura.
          </p>

          <p className="mt-2 text-sm leading-6 text-white/40">
            Verifica el dominio de acceso o contacta al administrador de tu organización.
          </p>
        </section>
      </main>
    );
  }
  if (!isAuthReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07111f] text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-300 border-t-transparent" />
      </main>
    );
  }

  if (
    isGrowthSurface &&
    !isAuthenticated &&
    !hasLocalGrowthPreviewAccess
  ) {
    return (
      <AuraGrowthLogin
        onLoginSuccess={() => {
          setIsAuthenticated(true);
        }}
      />
    );
  }

  if (
    isGrowthSurface &&
    (
      isAuthenticated ||
      hasLocalGrowthPreviewAccess
    )
  ) {
    return (
      <main className="min-h-screen bg-[#07111f] text-white">
        <div className="fixed right-4 top-4 z-50">
          <button
            type="button"
            onClick={() =>
              void handleLogout()
            }
            className="rounded-xl border border-white/10 bg-[#07111f]/85 px-4 py-2 text-xs font-bold text-white/55 shadow-lg backdrop-blur-md transition hover:border-cyan-300/20 hover:text-cyan-200"
          >
            Cerrar sesiÃ³n
          </button>
        </div>

        <GrowthStudioEntry />
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuraIntelligenceLogin
        onLoginSuccess={() => {
          setIsAuthenticated(true);

          setContext(
            buildDemoContext(
              auth.currentUser?.email ||
                null,
            ),
          );
        }}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#0d1117] text-white">
      <section className="border-b border-white/10 bg-white/[0.03] px-6 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-blue-300">
              Aura Ecosystem
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
              Aura Intelligence
            </h1>
          </div>

          <button
            type="button"
            onClick={() =>
              void handleLogout()
            }
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Cerrar sesiÃ³n
          </button>
        </div>
      </section>

      <ExecutiveWorkspace
        context={context}
      />

      <AuraAssistantWidget
        context={context}
      />
    </main>
  );
};

export default App;
