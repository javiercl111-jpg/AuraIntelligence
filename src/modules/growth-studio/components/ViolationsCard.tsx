import React from 'react';
import type { ReviewFinding } from '../types';

interface ViolationsCardProps {
  violations: ReviewFinding[];
}

export const ViolationsCard: React.FC<ViolationsCardProps> = ({ violations }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200">
      <h3 className="text-lg font-semibold text-red-800 mb-4">Critical & Blocking Violations</h3>
      {violations.length === 0 ? (
        <p className="text-sm text-slate-500">No violations detected.</p>
      ) : (
        <ul className="space-y-3">
          {violations.map(v => (
            <li key={v.id} className="text-sm text-slate-700 flex items-start bg-red-50 p-3 rounded">
              <span className="text-red-600 mr-2 font-bold">✕</span>
              <div>
                <span className="font-semibold text-red-900">{v.category}:</span> {v.description}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
