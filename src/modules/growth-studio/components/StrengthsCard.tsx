import React from 'react';
import type { ReviewFinding } from '../types';

interface StrengthsCardProps {
  strengths: ReviewFinding[];
}

export const StrengthsCard: React.FC<StrengthsCardProps> = ({ strengths }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-green-200">
      <h3 className="text-lg font-semibold text-green-800 mb-4">Strengths</h3>
      {strengths.length === 0 ? (
        <p className="text-sm text-slate-500">No notable strengths identified.</p>
      ) : (
        <ul className="space-y-3">
          {strengths.map(s => (
            <li key={s.id} className="text-sm text-slate-700 flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <div>
                <span className="font-semibold text-slate-800">{s.category}:</span> {s.description}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
