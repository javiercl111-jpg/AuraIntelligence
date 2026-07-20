import React from 'react';
import type { SupportingEvidence, OriginArtifact } from '../types/executiveContentBrief';
import { Lightbulb, Link as LinkIcon } from 'lucide-react';

interface EvidenceSummaryProps {
  evidence: SupportingEvidence[];
  originArtifacts: OriginArtifact[];
}

export const EvidenceSummary: React.FC<EvidenceSummaryProps> = ({ evidence, originArtifacts }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
      <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        Evidencia de Respaldo y Origen
      </h3>

      <div className="space-y-6">
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Artefactos de Origen</h4>
          <div className="flex flex-wrap gap-2">
            {originArtifacts.map(origin => (
              <div key={origin.id} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs rounded-md border border-indigo-100">
                <span className="font-semibold">{origin.type}</span>
                <span className="ml-2 text-indigo-400">({origin.fieldsUsed.join(', ')})</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Evidencia Rastreable</h4>
          {evidence.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No hay evidencia rastreable adjunta.</p>
          ) : (
            <div className="space-y-3">
              {evidence.map((item, idx) => (
                <div key={`${item.artifactId}-${idx}`} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex gap-3 items-start">
                  <LinkIcon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-700">{item.field}</span>
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase">{item.artifactType}</span>
                    </div>
                    <p className="text-xs text-slate-600">{item.evidence}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
