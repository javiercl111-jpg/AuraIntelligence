import React from 'react';
import type { ExecutiveContentBrief } from '../types/executiveContentBrief';
import { BriefReadinessIndicator } from './BriefReadinessIndicator';
import { ExecutiveContentBriefCard } from './ExecutiveContentBriefCard';
import { ConstraintCard } from './ConstraintCard';
import { SuccessCriteriaCard } from './SuccessCriteriaCard';
import { EvidenceSummary } from './EvidenceSummary';
import { NextGenerationActionCard } from './NextGenerationActionCard';
import { useGrowthI18n } from '../i18n/GrowthI18nProvider';

interface ExecutiveContentBriefSummaryProps {
  brief: ExecutiveContentBrief | null;
  onExecuteAction?: () => void;
}

export const ExecutiveContentBriefSummary: React.FC<ExecutiveContentBriefSummaryProps> = ({ brief, onExecuteAction }) => {
  const { messages } =
    useGrowthI18n();

  const advisor =
    messages.advisorPresentation;
  if (!brief) return null;

  return (
    <div className="w-full max-w-4xl mx-auto my-8 animate-fade-in-up">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">{advisor.executiveContentBrief}</h2>
            <p className="text-sm text-slate-500 mt-1">{advisor.executiveContentBriefDescription}</p>
          </div>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${
            brief.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
            brief.status === 'review_required' ? 'bg-amber-100 text-amber-700' :
            'bg-slate-100 text-slate-700'
          }`}>
            {brief.status === 'approved' ? advisor.approved :
             brief.status === 'review_required' ? advisor.reviewRequired : advisor.draft}
          </span>
        </div>

        <div className="p-6">
          <BriefReadinessIndicator brief={brief} />

          <ExecutiveContentBriefCard brief={brief} />

          <ConstraintCard constraints={brief.constraints} />

          <SuccessCriteriaCard criteria={brief.successCriteria} checklist={brief.acceptanceChecklist} />

          <EvidenceSummary evidence={brief.supportingEvidence} originArtifacts={brief.originArtifacts} />

          <NextGenerationActionCard action={brief.nextGenerationAction} onExecute={onExecuteAction} />
        </div>
      </div>
    </div>
  );
};
