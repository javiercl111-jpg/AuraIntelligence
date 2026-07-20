import React from 'react';
import type { ContentAsset } from '../types/contentPlan';

interface NextRecommendedAssetCardProps {
  asset: ContentAsset | null;
}

export const NextRecommendedAssetCard: React.FC<NextRecommendedAssetCardProps> = ({ asset }) => {
  if (!asset) {
    return (
      <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl mb-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Next Recommended Asset</h3>
        <p className="text-xs text-slate-500">
          No hay recomendaciones disponibles en este momento. Puede que el plan esté bloqueado o todos los activos estén completados.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 p-4 border border-blue-200 rounded-xl mb-6 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <h3 className="text-sm font-semibold text-blue-800">Siguiente Activo Recomendado</h3>
      </div>
      <div className="bg-white p-3 rounded-lg border border-blue-100">
        <div className="flex justify-between items-start mb-1">
          <span className="font-semibold text-slate-800 text-sm">{asset.title}</span>
          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-blue-100 text-blue-800 tracking-wider">
            Prioridad: {asset.priority}
          </span>
        </div>
        <p className="text-xs text-slate-600 mb-2">{asset.purpose}</p>
        <div className="text-[11px] text-slate-500 flex items-center gap-4">
          <span>Dependencias: {asset.parents.length}</span>
          <span>Desbloquea: {asset.children.length}</span>
        </div>
      </div>
    </div>
  );
};
