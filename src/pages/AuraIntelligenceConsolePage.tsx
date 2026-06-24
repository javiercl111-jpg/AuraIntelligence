import React from 'react';
import {
  Activity,
  Brain,
  Database,
  DollarSign,
  GitBranch,
  ShieldCheck,
  Workflow,
} from 'lucide-react';

const AuraIntelligenceConsolePage: React.FC = () => {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-purple-300">
        Aura Intelligence
      </p>

      <h2 className="mt-3 text-2xl font-black">
        Intelligence Console
      </h2>

      <p className="mt-3 text-sm leading-relaxed text-white/60">
        Consola ejecutiva para visualizar motores, conectores, acciones,
        auditoría, control de costos y estado general de Aura Intelligence.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <Brain className="text-purple-300" size={22} />
          <h3 className="mt-3 font-black">Intent Engine</h3>
          <p className="mt-2 text-sm text-white/55">
            Detecta intención, sistema y módulo a partir de preguntas del
            usuario.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <Database className="text-blue-300" size={22} />
          <h3 className="mt-3 font-black">Connectors</h3>
          <p className="mt-2 text-sm text-white/55">
            Conectores activos para Aura HCM, Aura Maintenance OS y Aura
            Signature.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <Workflow className="text-emerald-300" size={22} />
          <h3 className="mt-3 font-black">Action Engine</h3>
          <p className="mt-2 text-sm text-white/55">
            Sugiere acciones, navegación y próximos pasos según el contexto del
            usuario.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <GitBranch className="text-cyan-300" size={22} />
          <h3 className="mt-3 font-black">System Boundary Guard</h3>
          <p className="mt-2 text-sm text-white/55">
            Evita mezclar información entre HCM, Maintenance y Signature salvo
            consultas multi-sistema explícitas.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <DollarSign className="text-yellow-300" size={22} />
          <h3 className="mt-3 font-black">Cost Control Layer</h3>
          <p className="mt-2 text-sm text-white/55">
            Controla modo de uso, tokens estimados, costos y límites antes de
            permitir IA externa.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <ShieldCheck className="text-green-300" size={22} />
          <h3 className="mt-3 font-black">Governance</h3>
          <p className="mt-2 text-sm text-white/55">
            Gestiona ciclo de vida, revisión, versión y vigencia del
            conocimiento.
          </p>
        </article>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center gap-3">
          <Activity className="text-purple-300" size={22} />

          <div>
            <h3 className="font-black">Estado general</h3>
            <p className="text-sm text-white/55">
              Aura Intelligence opera actualmente en modo Knowledge + Connectors
              + Navigation, sin dependencia obligatoria de OpenAI.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AuraIntelligenceConsolePage;