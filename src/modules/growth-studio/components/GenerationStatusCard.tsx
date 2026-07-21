import React from 'react';
import type { GenerationDraftStatus } from '../types';

interface GenerationStatusCardProps {
  status: GenerationDraftStatus;
  updatedAt: string;
}

export const GenerationStatusCard: React.FC<GenerationStatusCardProps> = ({ status, updatedAt }) => {
  const getStatusColor = (s: GenerationDraftStatus) => {
    switch (s) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'revision_required': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'validation_required': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'generated': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'generation_pending': default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex items-center justify-between">
      <div>
        <span className="block text-xs font-medium text-gray-500 uppercase">Engine Status</span>
        <div className="mt-1 flex items-center">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
            {status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>
      <div className="text-right">
        <span className="block text-xs font-medium text-gray-500 uppercase">Last Updated</span>
        <span className="block mt-1 text-sm text-gray-900">
          {new Date(updatedAt).toLocaleString()}
        </span>
      </div>
    </div>
  );
};
