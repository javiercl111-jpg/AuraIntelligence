import React from 'react';
import type { ReviewRecommendation } from '../types';

interface RecommendationsCardProps {
  recommendations: ReviewRecommendation[];
}

export const RecommendationsCard: React.FC<RecommendationsCardProps> = ({ recommendations }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-200">
      <h3 className="text-lg font-semibold text-blue-800 mb-4">Recommendations for Approval</h3>
      {recommendations.length === 0 ? (
        <p className="text-sm text-slate-500">No specific recommendations provided.</p>
      ) : (
        <ul className="space-y-3 list-decimal list-inside text-sm text-slate-700">
          {recommendations.map(r => (
            <li key={r.id}>
              <span className="font-semibold">{r.category}:</span> {r.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
