import React from 'react';
import type { ContentAsset } from '../types/contentPlan';

interface ContentAssetCardProps {
  asset: ContentAsset;
}

export const ContentAssetCard: React.FC<ContentAssetCardProps> = ({ asset }) => {
  return (
    <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm mb-4">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-semibold text-slate-800">{asset.title}</h4>
        <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-600">
          {asset.phase}
        </span>
      </div>
      <div className="text-xs text-slate-600 space-y-1">
        <p><strong>Propósito:</strong> {asset.purpose}</p>
        <p><strong>Objetivo:</strong> {asset.objective.value}</p>
        <p><strong>Audiencia:</strong> {asset.audience.value}</p>
        <p>
          <strong>Canales:</strong>{' '}
          {asset.distributionTargets.status === 'confirmed'
            ? asset.distributionTargets.value.join(', ')
            : 'Pendiente'}
        </p>
        <p><strong>Origen:</strong> {asset.originArtifact}</p>
        <p><strong>Dependencias:</strong> {asset.dependencyIds.length}</p>
      </div>
    </div>
  );
};
