import React from 'react';
import type { GeneratedContentDraft } from '../types';

interface GeneratedDraftCardProps {
  draft: GeneratedContentDraft;
}

export const GeneratedDraftCard: React.FC<GeneratedDraftCardProps> = ({ draft }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mt-6">
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Generated Content Draft</h3>
          <p className="text-sm text-gray-500 mt-1">Provider: {draft.provider} ({draft.model})</p>
        </div>
        <div>
          <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 border border-purple-200">
            {draft.generationDuration}ms
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-gray-50 rounded-md p-4 border border-gray-100 min-h-[200px]">
          <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
            {draft.generatedContent || 'No content generated.'}
          </pre>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-gray-500">
          <div>Traceability Hash: <span className="font-mono">{draft.traceabilityHash}</span></div>
          <div>Instruction Version: v{draft.instructionVersion}</div>
        </div>
      </div>
    </div>
  );
};
