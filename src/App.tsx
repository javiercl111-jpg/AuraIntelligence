import React, { useEffect, useState } from 'react';
import { Bot, BookOpen, History, ShieldCheck } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';

import { auth } from './firebase';

import AuraAssistantWidget from './components/AuraAssistantWidget';
import AuraCopilotDraftsPanel from './components/AuraCopilotDraftsPanel';
import AuraIntelligenceLogin from './components/AuraIntelligenceLogin';
import KnowledgeCenterPage from './pages/KnowledgeCenterPage';
import ConversationsAuditPage from './pages/ConversationsAuditPage';
import AuraIntelligenceConsolePage from './pages/AuraIntelligenceConsolePage';

import type { AuraIntelligenceContext } from './types/auraIntelligence';
import { seedDefaultArticles } from './services/auraKnowledgeAdminService';
import { isFeatureEnabled } from './services/featureFlagService';
import { GrowthStudioEntry } from './modules/growth-studio';

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

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
              Plataforma central de IA para soporte, onboarding, conocimiento,
              auditoría y asistencia contextual en Aura HCM, Aura Maintenance
              OS, Aura Signature y futuros módulos.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              Copilot V2 · Draft Mode
            </div>

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

      <section className="mx-auto grid max-w-6xl gap-4 px-6 py-8 md:grid-cols-4">
        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <Bot className="text-cyan-300" size={24} />
          <h2 className="mt-4 font-bold">Assistant Core</h2>
          <p className="mt-2 text-sm text-white/55">
            Motor contextual para responder preguntas con conocimiento,
            conectores y acciones sugeridas.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <BookOpen className="text-cyan-300" size={24} />
          <h2 className="mt-4 font-bold">Knowledge Center</h2>
          <p className="mt-2 text-sm text-white/55">
            Base de conocimiento por sistema, módulo, idioma, categoría y rol.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <ShieldCheck className="text-cyan-300" size={24} />
          <h2 className="mt-4 font-bold">Boundary Guard</h2>
          <p className="mt-2 text-sm text-white/55">
            Evita mezclar datos entre HCM, Maintenance y Signature sin intención
            explícita.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <History className="text-cyan-300" size={24} />
          <h2 className="mt-4 font-bold">Audit Log</h2>
          <p className="mt-2 text-sm text-white/55">
            Registro de preguntas, respuestas, conectores, costos y contexto.
          </p>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-10 lg:grid-cols-2">
        <AuraIntelligenceConsolePage />
        <AuraCopilotDraftsPanel />
        <ConversationsAuditPage />
        <KnowledgeCenterPage />
      </section>

      {isFeatureEnabled('growth_studio.enabled') && (
        <section className="mx-auto max-w-6xl px-6 pb-8">
          <GrowthStudioEntry />
        </section>
      )}

      <AuraAssistantWidget context={context} />
    </main>
  );
};

export default App;