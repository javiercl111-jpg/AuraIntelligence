import React from 'react';
import type { ReviewFinding } from '../types';

interface WeaknessesCardProps {
  weaknesses: ReviewFinding[];
}

export const WeaknessesCard: React.FC<WeaknessesCardProps> = ({ weaknesses }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-yellow-200">
      <h3 className="text-lg font-semibold text-yellow-800 mb-4">Weaknesses</h3>
      {weaknesses.length === 0 ? (
        <p className="text-sm text-slate-500">No weaknesses identified.</p>
      ) : (
        <ul className="space-y-3">
          {weaknesses.map(w => (
            <li key={w.id} className="text-sm text-slate-700 flex items-start">
              <span className="text-yellow-500 mr-2">⚠</span>
              <div>
                <span className="font-semibold text-slate-800">{w.category}:</span> {w.description}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
