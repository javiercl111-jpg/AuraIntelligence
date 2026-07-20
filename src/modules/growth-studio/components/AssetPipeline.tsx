import React from 'react';
import type { AssetDependencyGraph, ContentAsset } from '../types/contentPlan';

interface AssetPipelineProps {
  pipeline: AssetDependencyGraph;
  assets: ContentAsset[];
}

export const AssetPipeline: React.FC<AssetPipelineProps> = ({ pipeline, assets }) => {
  if (pipeline.nodes.length === 0) {
    return <p className="text-sm text-slate-500 italic">Pipeline no definido.</p>;
  }

  // Linear visualization for now based on nodes order
  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
      <h3 className="text-sm font-semibold text-slate-800 mb-4">Pipeline de Producción (DAG)</h3>
      <div className="flex flex-wrap items-center gap-2">
        {pipeline.nodes.map((nodeId, index) => {
          const asset = assets.find(a => a.id === nodeId);
          if (!asset) return null;

          return (
            <React.Fragment key={nodeId}>
              <div className="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-medium text-slate-700 shadow-sm">
                {asset.title}
              </div>
              {index < pipeline.nodes.length - 1 && (
                <div className="text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          * Representación simplificada del AssetDependencyGraph ({pipeline.edges.length} aristas).
        </p>
      </div>
    </div>
  );
};
