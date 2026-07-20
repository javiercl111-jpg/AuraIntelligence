import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';

import { auth } from './firebase';

import type { AuraIntelligenceContext } from './types/auraIntelligence';
import { seedDefaultArticles } from './services/auraKnowledgeAdminService';
import ExecutiveWorkspace from './components/ExecutiveWorkspace';
import AuraIntelligenceLogin from './components/AuraIntelligenceLogin';
import AuraAssistantWidget from './components/AuraAssistantWidget';

const buildDemoContext = (userEmail?: string | null): AuraIntelligenceContext => ({
  tenantId: 'aura_demo',
  companyId: 'aura_demo',
  userId: auth.currentUser?.uid || 'demo_admin',
  userEmail: userEmail || auth.currentUser?.email || 'admin@aura.demo',
  userName: auth.currentUser?.displayName || 'Administrador Aura',
  role: 'SUPER_ADMIN',
  profileId: 'super-admin',
  permissions: ['aura_intelligence:read', 'aura_intelligence:admin'],
  system: 'aura_hcm',
  module: 'payroll',
  route: '/',
  language: 'es',
});

const App: React.FC = () => {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [context, setContext] = useState<AuraIntelligenceContext>(
    buildDemoContext()
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setIsAuthenticated(Boolean(firebaseUser));
      setContext(buildDemoContext(firebaseUser?.email || null));
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const runSeed = async () => {
      try {
        await seedDefaultArticles();
      } catch (error) {
        console.error('[Aura Intelligence] Error al sembrar los artículos de conocimiento por defecto:', error);
      }
    };
    void runSeed();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (!isAuthReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0d1117] text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuraIntelligenceLogin
        onLoginSuccess={() => {
          setIsAuthenticated(true);
          setContext(buildDemoContext(auth.currentUser?.email || null));
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
          <div className="flex flex-col gap-3 md:items-end">
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </section>

      <ExecutiveWorkspace context={context} />

      <AuraAssistantWidget context={context} />
    </main>
  );
};

export default App;