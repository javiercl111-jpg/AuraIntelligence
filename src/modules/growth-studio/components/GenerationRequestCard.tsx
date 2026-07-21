import React from 'react';
import type { ExecutiveGenerationRequest } from '../types';

interface GenerationRequestCardProps {
  request: ExecutiveGenerationRequest;
}

export const GenerationRequestCard: React.FC<GenerationRequestCardProps> = ({ request }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">Executive Generation Request</h3>
        <p className="text-sm text-gray-500 mt-1">ID: {request.id}</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="block text-xs font-medium text-gray-500 uppercase">Intent</span>
            <span className="block mt-1 text-sm text-gray-900">{request.generationIntent}</span>
          </div>
          <div>
            <span className="block text-xs font-medium text-gray-500 uppercase">Language</span>
            <span className="block mt-1 text-sm text-gray-900">{request.language}</span>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Content Sections</h4>
          <div className="space-y-3">
            {request.contentSections.map((section, idx) => (
              <div key={section.id || idx} className="bg-gray-50 p-4 rounded-md border border-gray-100">
                <h5 className="font-medium text-sm text-gray-900">{section.heading}</h5>
                <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{section.instructions}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Provider Constraints</h4>
          <ul className="list-disc pl-5 space-y-1">
            {request.providerConstraints.map((constraint, idx) => (
              <li key={idx} className="text-sm text-gray-600">{constraint}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
