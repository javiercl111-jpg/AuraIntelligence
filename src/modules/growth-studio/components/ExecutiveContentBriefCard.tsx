import React from 'react';
import type { ExecutiveContentBrief } from '../types/executiveContentBrief';
import { FileText } from 'lucide-react';

interface ExecutiveContentBriefCardProps {
  brief: ExecutiveContentBrief;
}

export const ExecutiveContentBriefCard: React.FC<ExecutiveContentBriefCardProps> = ({ brief }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" />
          Especificaciones del Brief
        </h3>
        {brief.selectedAsset && (
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-100">
            Activo: {brief.selectedAsset.title}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
          <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-1">Propósito del Activo</h4>
          <p className="text-sm text-slate-700">{brief.assetPurpose.value || <span className="italic text-slate-400">Sin definir</span>}</p>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
          <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-1">Mensaje Central</h4>
          <p className="text-sm text-slate-700">{brief.coreMessage.value || <span className="italic text-slate-400">Sin definir</span>}</p>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
          <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-1">Audiencia Objetivo</h4>
          <p className="text-sm text-slate-700">{brief.targetAudience.value || <span className="italic text-slate-400">Sin definir</span>}</p>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex gap-4">
          <div className="flex-1">
            <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-1">Tono</h4>
            <p className="text-sm text-slate-700 capitalize">{brief.tone.value || '-'}</p>
          </div>
          <div className="flex-1 border-l border-slate-200 pl-4">
            <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-1">Intención Ejecutiva</h4>
            <p className="text-sm text-slate-700 capitalize">{brief.executiveIntent.value || '-'}</p>
          </div>
        </div>
      </div>

      {brief.businessContext.value && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <h4 className="text-[10px] uppercase font-bold text-blue-600 mb-1">Contexto de Negocio</h4>
          <p className="text-sm text-slate-800">{brief.businessContext.value}</p>
        </div>
      )}
    </div>
  );
};
