import React from 'react';
import type { ContentPlan } from '../types/contentPlan';
import { ContentReadinessIndicator } from './ContentReadinessIndicator';
import { NextRecommendedAssetCard } from './NextRecommendedAssetCard';
import { ContentRisksCard } from './ContentRisksCard';
import { AssetPipeline } from './AssetPipeline';
import { ContentAssetCard } from './ContentAssetCard';
import { useGrowthI18n } from '../i18n/GrowthI18nProvider';

interface ContentPlanSummaryProps {
  plan: ContentPlan;
}

export const ContentPlanSummary: React.FC<ContentPlanSummaryProps> = ({ plan }) => {
  const { messages } =
    useGrowthI18n();

  const advisor =
    messages.advisorPresentation;
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">{advisor.contentPlanning}</h2>
            <p className="text-sm text-slate-500 mt-1">{advisor.contentPlanningDescription}</p>
          </div>
          <span className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-medium rounded-full">
            {plan.status === 'confirmed' ? advisor.confirmed : advisor.draft}
          </span>
        </div>

        <ContentReadinessIndicator plan={plan} />

        <ContentRisksCard risks={plan.contentRisks} />

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">{advisor.productionInputs}</h3>
          <div className="grid grid-cols-2 gap-3">
            {plan.productionInputs.map(input => (
              <div key={input.id} className="p-3 border border-slate-100 rounded-lg bg-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-700">{input.description}</p>
                  <p className="text-[11px] text-slate-500 truncate max-w-[200px]">{input.value || '{advisor.missingDefinition}'}</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${input.isReady ? 'bg-green-500' : 'bg-red-400'}`} />
              </div>
            ))}
          </div>
        </div>

        <NextRecommendedAssetCard asset={plan.nextRecommendedAsset} />

        <div className="mb-6">
          <AssetPipeline pipeline={plan.assetPipeline} assets={plan.contentAssets} />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-800 mb-3">{advisor.assetsToProduce} ({plan.contentAssets.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plan.contentAssets.map(asset => (
              <ContentAssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
