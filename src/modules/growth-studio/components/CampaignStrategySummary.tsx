import React from 'react';
import type { CampaignStrategy, StrategyRisk } from '../types/campaignStrategy';
import { CampaignStrategyCard } from './CampaignStrategyCard';
import { ReadinessIndicator } from './ReadinessIndicator';
import { AssumptionsCard } from './AssumptionsCard';
import { KnowledgeGapCard } from './KnowledgeGapCard';
import { useGrowthI18n } from '../i18n/GrowthI18nProvider';
import { presentGrowthEnum } from '../i18n/growthEnumPresentation';

interface StrategyRisksCardProps {
  risks: StrategyRisk[];
}

const StrategyRisksCard: React.FC<StrategyRisksCardProps> = ({ risks }) => {
  const { messages } =
    useGrowthI18n();

  const advisor =
    messages.advisorPresentation;
  if (!risks || risks.length === 0) return null;

  return (
    <div className="bg-red-50 p-6 rounded-2xl shadow-sm border border-red-100 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🚨</span>
        <h3 className="text-xl font-bold text-red-900 tracking-tight">{advisor.strategicRisks}</h3>
      </div>
      <p className="text-sm text-red-700 opacity-90">
        {advisor.strategicRisksDescription}
      </p>
      <div className="grid gap-3">
        {risks.map((risk, idx) => (
          <div key={idx} className="bg-white p-3 rounded-xl border border-red-200 flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-red-600 uppercase tracking-wider">{risk.type} {advisor.risk}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                risk.impact === 'high' ? 'bg-red-200 text-red-800' :
                risk.impact === 'medium' ? 'bg-orange-200 text-orange-800' : 'bg-yellow-200 text-yellow-800'
              }`}>
                {presentGrowthEnum('impact', risk.impact, advisor)} {advisor.impact}
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
  const { messages } =
    useGrowthI18n();

  const advisor =
    messages.advisorPresentation;
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center mb-4">
        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
          {advisor.campaignStrategy}
        </h2>
        <p className="text-gray-600 mt-2">
          {advisor.campaignStrategyDescription}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <ReadinessIndicator score={strategy.readinessScore} reason={strategy.strategyReadinessReason} />
        </div>

        <CampaignStrategyCard label={advisor.campaignObjective} field={strategy.campaignObjective} />
        <CampaignStrategyCard label={advisor.primaryAudience} field={strategy.primaryAudience} />
        <CampaignStrategyCard label={advisor.coreMessage} field={strategy.coreMessage} />
        <CampaignStrategyCard label={advisor.valueDrivers} field={strategy.valueDrivers} />
        <CampaignStrategyCard label={advisor.recommendedChannels} field={strategy.recommendedChannels} />
        <CampaignStrategyCard label={advisor.recommendedContentTypes} field={strategy.recommendedContentTypes} />
        <CampaignStrategyCard label={advisor.callsToAction} field={strategy.callsToAction} />
        <CampaignStrategyCard label={advisor.secondaryAudience} field={strategy.secondaryAudience} />
      </div>

      <div className="mt-4 flex flex-col gap-6">
        <StrategyRisksCard risks={strategy.strategyRisks} />
        <AssumptionsCard assumptions={strategy.assumptions} />
        <KnowledgeGapCard
          gaps={strategy.knowledgeGaps}
          title={advisor.strategyGaps}
          description={advisor.strategyGapsDescription}
        />
      </div>

      <div className="text-right mt-2 text-xs text-gray-400">
        {advisor.strategyEvidenceScore}: {strategy.strategyEvidenceScore}%
      </div>
    </div>
  );
};

export default CampaignStrategySummary;
