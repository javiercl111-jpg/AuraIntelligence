// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Executive Proposal Card
// ─────────────────────────────────────────────────────────────

import React from 'react';
import type { GrowthStructuredContext } from '../types/growthConversation';
import type { ExecutiveExecutionPlan } from '../types/executiveExecutionPlan';
import type { ContentPlan } from '../types/contentPlan';
import type { ExecutiveContentBrief } from '../types/executiveContentBrief';
import { PlayCircle, AlertTriangle, ShieldCheck, ShieldAlert, FileText, CheckCircle } from 'lucide-react';

interface ExecutiveProposalCardProps {
  context: GrowthStructuredContext;
  plan?: ExecutiveExecutionPlan | null;
  contentPlan?: ContentPlan | null;
  contentBrief?: ExecutiveContentBrief | null;
}

export const ExecutiveProposalCard: React.FC<ExecutiveProposalCardProps> = ({ context, plan, contentPlan, contentBrief }) => {
  return (
    <div className="w-full max-w-2xl mx-auto my-6 p-8 rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-950/60 to-black shadow-2xl shadow-emerald-900/20">
      <div className="text-center mb-6">
        <span className="inline-block px-3 py-1 mb-3 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 rounded-full">
          Propuesta preliminar de demostración
        </span>
        <h2 className="text-2xl font-black text-white">Plan de Crecimiento Ejecutivo</h2>
      </div>

      <div className="space-y-6">
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <h4 className="text-sm font-semibold text-emerald-300 mb-2">Estrategia Central</h4>
          <p className="text-sm text-emerald-50/80 leading-relaxed">
            Basado en tu objetivo de <strong>{context.objective || 'N/A'}</strong>, proponemos una campaña focalizada en <strong>{context.audience || 'N/A'}</strong> dentro de <strong>{context.region || 'N/A'}</strong>.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <h4 className="text-sm font-semibold text-emerald-300 mb-2">Enfoque de Ejecución</h4>
          <p className="text-sm text-emerald-50/80 leading-relaxed">
            Se priorizará un mensaje de autoridad y confianza, buscando lograr <strong>{context.expectedResult || 'N/A'}</strong>. Esta es una propuesta simulada sin IA real, diseñada para validar la fundación de Aura Growth Studio™.
          </p>
        </div>

        {plan && (
          <>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <h4 className="text-sm font-semibold text-emerald-300 mb-4 flex items-center gap-2">
                Preparación para Ejecutar
                {plan.isBlocked ? <ShieldAlert size={16} className="text-red-400" /> : <ShieldCheck size={16} className="text-emerald-400" />}
              </h4>
              <p className="text-sm text-emerald-50/80 leading-relaxed mb-4">
                El plan tiene un readiness de <strong>{plan.executionReadiness}%</strong>. {plan.executionReadinessReason}
              </p>

              {plan.missingDependencies.filter(d => d.criticality === 'blocker').length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-red-400 mb-1 flex items-center gap-1"><AlertTriangle size={12}/> Dependencias críticas bloqueantes:</p>
                  <ul className="list-disc list-inside text-xs text-red-200/80 ml-1">
                    {plan.missingDependencies.filter(d => d.criticality === 'blocker').map(d => (
                      <li key={d.id}>{d.description}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-400/30">
              <h4 className="text-sm font-semibold text-emerald-300 mb-2 flex items-center gap-2">
                <PlayCircle size={16} /> Próxima Acción Inmediata
              </h4>
              <p className="text-sm text-emerald-50/90 font-medium">
                {plan.nextRecommendedAction ? plan.nextRecommendedAction.title : 'Revisar y aprobar plan de ejecución'}
              </p>
              <p className="text-xs text-emerald-50/50 mt-1 capitalize">
                Fase recomendada: {plan.nextRecommendedAction ? plan.nextRecommendedAction.phase.replace('_', ' ') : 'Preparación'}
              </p>
            </div>
          </>
        )}

        {contentPlan && contentPlan.contentAssets.length > 0 && (
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-400/30">
            <h4 className="text-sm font-semibold text-emerald-300 mb-2 flex items-center gap-2">
              <FileText size={16} /> Plan de Producción
            </h4>
            <p className="text-sm text-emerald-50/90 font-medium mb-3">
              Estos son los activos que debemos producir primero:
            </p>
            <ul className="space-y-2">
              {contentPlan.contentAssets.map(asset => (
                <li key={asset.id} className="text-xs text-emerald-50/80 p-2 rounded bg-white/5 border border-white/5 flex justify-between items-center">
                  <span><strong>{asset.title}</strong></span>
                  <span className="text-[10px] text-emerald-200/50 uppercase tracking-wider">{asset.priority}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {contentBrief && (
          <div className={`p-4 rounded-lg border ${
            contentBrief.status === 'approved'
              ? 'bg-emerald-500/10 border-emerald-400/30'
              : 'bg-indigo-500/10 border-indigo-400/30'
          }`}>
            <h4 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${
              contentBrief.status === 'approved' ? 'text-emerald-300' : 'text-amber-300'
            }`}>
              <CheckCircle size={16} />
              {contentBrief.status === 'approved' ? 'Brief Aprobado' : 'Brief Propuesto para Revisión'}
            </h4>
            <p className="text-sm text-emerald-50/80">
              Activo: <strong>{contentBrief.selectedAsset?.title || 'Sin asignar'}</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutiveProposalCard;
