import React from 'react';
import type { ExecutiveGenerationRequest, GeneratedContentDraft, GenerationPolicy } from '../types';
import { ProviderSelectionCard } from './ProviderSelectionCard';
import { GenerationRequestCard } from './GenerationRequestCard';
import { GeneratedDraftCard } from './GeneratedDraftCard';
import { GenerationTraceCard } from './GenerationTraceCard';
import { GenerationWarningsCard } from './GenerationWarningsCard';
import { GenerationStatusCard } from './GenerationStatusCard';

interface ExecutiveGenerationSummaryProps {
  policy: GenerationPolicy;
  request: ExecutiveGenerationRequest;
  draft: GeneratedContentDraft | null;
}

export const ExecutiveGenerationSummary: React.FC<ExecutiveGenerationSummaryProps> = ({
  policy,
  request,
  draft
}) => {
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Executive Generation Engine™
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          AI Independence • Prompt Isolation • Zero Trust Validation • Explainable Generation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GenerationRequestCard request={request} />
          {draft && <GeneratedDraftCard draft={draft} />}
          {draft && <GenerationTraceCard traces={draft.generationTrace} />}
        </div>

        <div className="space-y-6">
          <GenerationStatusCard
            status={draft ? draft.status : 'generation_pending'}
            updatedAt={draft ? draft.updatedAt : request.updatedAt}
          />
          <ProviderSelectionCard
            policy={policy}
            selectedProviderId={draft?.provider}
          />
          {draft && <GenerationWarningsCard validation={draft.generationValidation} />}
        </div>
      </div>
    </div>
  );
};
