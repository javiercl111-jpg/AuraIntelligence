import React from 'react';
import type { CampaignStrategy, StrategyRisk } from '../types/campaignStrategy';
import { CampaignStrategyCard } from './CampaignStrategyCard';
import { ReadinessIndicator } from './ReadinessIndicator';
import { AssumptionsCard } from './AssumptionsCard';
import { KnowledgeGapCard } from './KnowledgeGapCard';

interface StrategyRisksCardProps {
  risks: StrategyRisk[];
}

const StrategyRisksCard: React.FC<StrategyRisksCardProps> = ({ risks }) => {
  if (!risks || risks.length === 0) return null;

  return (
    <div className="bg-red-50 p-6 rounded-2xl shadow-sm border border-red-100 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🚨</span>
        <h3 className="text-xl font-bold text-red-900 tracking-tight">Riesgos Estratégicos</h3>
      </div>
      <p className="text-sm text-red-700 opacity-90">
        Factores que podrían comprometer la ejecución de la estrategia si no se resuelven a tiempo.
      </p>
      <div className="grid gap-3">
        {risks.map((risk, idx) => (
          <div key={idx} className="bg-white p-3 rounded-xl border border-red-200 flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-red-600 uppercase tracking-wider">{risk.type} Risk</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                risk.impact === 'high' ? 'bg-red-200 text-red-800' : 
                risk.impact === 'medium' ? 'bg-orange-200 text-orange-800' : 'bg-yellow-200 text-yellow-800'
              }`}>
                {risk.impact} Impact
              </span>
            </div>
            <p className="text-sm text-gray-800 mt-1">{risk.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

interface CampaignStrategySummaryProps {
  strategy: CampaignStrategy;
}

export const CampaignStrategySummary: React.FC<CampaignStrategySummaryProps> = ({ strategy }) => {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center mb-4">
        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
          Campaign Strategy™ Lite
        </h2>
        <p className="text-gray-600 mt-2">
          Estrategia preliminar generada automáticamente a partir del Growth Objective y Brand Brain.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <ReadinessIndicator score={strategy.readinessScore} reason={strategy.strategyReadinessReason} />
        </div>

        <CampaignStrategyCard label="Objetivo de Campaña" field={strategy.campaignObjective} />
        <CampaignStrategyCard label="Audiencia Principal" field={strategy.primaryAudience} />
        <CampaignStrategyCard label="Mensaje Central" field={strategy.coreMessage} />
        <CampaignStrategyCard label="Drivers de Valor" field={strategy.valueDrivers} />
        <CampaignStrategyCard label="Canales Recomendados" field={strategy.recommendedChannels} />
        <CampaignStrategyCard label="Formatos de Contenido" field={strategy.recommendedContentTypes} />
        <CampaignStrategyCard label="Llamados a la Acción (CTA)" field={strategy.callsToAction} />
        <CampaignStrategyCard label="Audiencia Secundaria" field={strategy.secondaryAudience} />
      </div>

      <div className="mt-4 flex flex-col gap-6">
        <StrategyRisksCard risks={strategy.strategyRisks} />
        <AssumptionsCard assumptions={strategy.assumptions} />
        <KnowledgeGapCard 
          gaps={strategy.knowledgeGaps} 
          title="Vacíos de Estrategia"
          description="Información crítica faltante que Aura no pudo inferir con confianza."
        />
      </div>

      <div className="text-right mt-2 text-xs text-gray-400">
        Strategy Evidence Score: {strategy.strategyEvidenceScore}%
      </div>
    </div>
  );
};

export default CampaignStrategySummary;
