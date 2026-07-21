import React, { useState } from 'react';
import { Bot, BookOpen, History, ShieldCheck, Activity, ArrowLeft } from 'lucide-react';
import { isFeatureEnabled } from '../services/featureFlagService';
import type { AuraIntelligenceContext } from '../types/auraIntelligence';

import AuraCopilotDraftsPanel from './AuraCopilotDraftsPanel';
import KnowledgeCenterPage from '../pages/KnowledgeCenterPage';
import ConversationsAuditPage from '../pages/ConversationsAuditPage';
import AuraIntelligenceConsolePage from '../pages/AuraIntelligenceConsolePage';
import { GrowthStudioEntry } from '../modules/growth-studio';

interface ExecutiveWorkspaceProps {
  context: AuraIntelligenceContext;
}

type IntelligenceWorkspaceView = 'home' | 'growth';

const ExecutiveWorkspace: React.FC<ExecutiveWorkspaceProps> = ({ context }) => {
  const isGrowthStudioEnabled = isFeatureEnabled('growth_studio.enabled');
  const [currentView, setCurrentView] = useState<IntelligenceWorkspaceView>('home');

  const hour = new Date().getHours();
  let greeting = 'Buenos días';
  if (hour >= 12 && hour < 19) greeting = 'Buenas tardes';
  if (hour >= 19 || hour < 5) greeting = 'Buenas noches';

  // No usar email o uid como nombre.
  let finalName = '';
  if (context.userName && context.userName !== 'Administrador Aura' && !context.userName.includes('@')) {
    finalName = `, ${context.userName.trim()}`;
  }

  const welcomeText = `${greeting}${finalName}. Aura ha preparado tu espacio de trabajo.`;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Saludo Ejecutivo */}
      <section className={`mb-10 ${currentView !== 'home' ? 'hidden' : ''}`}>
        <h2 className="text-3xl font-light tracking-tight text-white">{welcomeText}</h2>
      </section>

      {/* VISTA HOME */}
      <div style={{ display: currentView === 'home' ? 'block' : 'none' }}>
        {/* Primary Area */}
        <section className="mb-12">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Asistencia y Conocimiento - Siempre Visible */}
            <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-8 ${isGrowthStudioEnabled ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
              <h3 className="mb-2 text-xl font-bold text-white">Asistencia y Conocimiento</h3>
              <p className="mb-6 text-sm text-white/60 max-w-xl">
                Consulta información operativa, gestiona borradores de acciones y mantén el control sobre las operaciones del ecosistema.
              </p>
              <div className="flex gap-4">
                <button className="flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-cyan-500">
                  Abrir Copilot <Bot size={16} />
                </button>
              </div>
            </div>

            {/* Crecimiento Ejecutivo - Visible solo si flag es true */}
            {isGrowthStudioEnabled && (
              <div className="flex flex-col justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
                <Activity className="mx-auto mb-4 text-emerald-400" size={32} />
                <h3 className="mb-2 font-bold text-white">Crecimiento Ejecutivo</h3>
                <p className="mb-6 text-sm text-white/60">
                  Construye una estrategia de crecimiento, conviértela en un plan de ejecución y prepara activos empresariales con revisión y control ejecutivo.
                </p>
                <button 
                  onClick={() => setCurrentView('growth')}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-500"
                >
                  Abrir Growth Studio
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Borradores */}
        <section className="mb-12">
           <AuraCopilotDraftsPanel />
        </section>

        {/* Herramientas Administrativas */}
        <section>
          <h3 className="mb-6 text-lg font-medium text-white/50 uppercase tracking-widest text-sm">Herramientas Administrativas</h3>
          
          <div className="grid gap-4 mb-6 md:grid-cols-4">
            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 hover:bg-white/[0.06] transition cursor-pointer">
              <Bot className="text-white/40" size={24} />
              <h4 className="mt-4 font-bold">Assistant Core</h4>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 hover:bg-white/[0.06] transition cursor-pointer">
              <BookOpen className="text-white/40" size={24} />
              <h4 className="mt-4 font-bold">Knowledge Center</h4>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 hover:bg-white/[0.06] transition cursor-pointer">
              <ShieldCheck className="text-white/40" size={24} />
              <h4 className="mt-4 font-bold">Boundary Guard</h4>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 hover:bg-white/[0.06] transition cursor-pointer">
              <History className="text-white/40" size={24} />
              <h4 className="mt-4 font-bold">Audit Log</h4>
            </article>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 opacity-80">
            <AuraIntelligenceConsolePage />
            <ConversationsAuditPage />
            <KnowledgeCenterPage />
          </div>
        </section>
      </div>

      {/* VISTA GROWTH */}
      {isGrowthStudioEnabled && (
        <div style={{ display: currentView === 'growth' ? 'block' : 'none' }}>
          <button 
            onClick={() => setCurrentView('home')}
            className="mb-6 flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Volver a Aura Intelligence
          </button>
          
          <GrowthStudioEntry />
        </div>
      )}
    </div>
  );
};

export default ExecutiveWorkspace;

