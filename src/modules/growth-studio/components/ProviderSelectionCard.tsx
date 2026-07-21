import React from 'react';
import type { GenerationPolicy } from '../types';

interface ProviderSelectionCardProps {
  policy: GenerationPolicy;
  selectedProviderId?: string;
}

export const ProviderSelectionCard: React.FC<ProviderSelectionCardProps> = ({ policy, selectedProviderId }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Provider Resolution</h3>
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
          Policy: {policy.name}
        </span>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
            <span className="block text-xs font-medium text-gray-500 uppercase">Selected Provider</span>
            <span className="block mt-1 text-sm font-medium text-gray-900">
              {selectedProviderId || 'Pending Resolution...'}
            </span>
          </div>
          <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
            <span className="block text-xs font-medium text-gray-500 uppercase">Policy Level</span>
            <span className="block mt-1 text-sm font-medium text-gray-900 capitalize">
              {policy.level}
            </span>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Mandatory Capabilities</h4>
          <div className="flex flex-wrap gap-2">
            {policy.mandatoryCapabilities.map((cap) => (
              <span key={cap} className="inline-flex items-center rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                {cap}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
