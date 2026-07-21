import React from 'react';
import type { ExecutiveReviewReport } from '../types';

interface ReviewScoreCardProps {
  report: ExecutiveReviewReport;
}

export const ReviewScoreCard: React.FC<ReviewScoreCardProps> = ({ report }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h3 className="text-lg font-semibold text-slate-800 mb-2">Global Score</h3>
      <div className="flex items-end space-x-4">
        <span className="text-4xl font-bold text-slate-900">{report.overallScore}</span>
        <span className="text-sm text-slate-500 mb-1">/ 100</span>
      </div>
      <div className="mt-4">
        <span className="text-sm font-medium text-slate-600">Aura Automated Status: </span>
        <span className={`text-sm font-bold ${
          report.status === 'approved' ? 'text-green-600' :
          report.status === 'approved_with_observations' ? 'text-yellow-600' :
          report.status === 'revision_required' ? 'text-orange-600' :
          'text-red-600'
        }`}>
          {report.status.toUpperCase().replace(/_/g, ' ')}
        </span>
      </div>
      <div className="mt-2">
        <span className="text-sm font-medium text-slate-600">Human Review Status: </span>
        <span className="text-sm font-bold text-blue-600 uppercase">
          {report.humanReviewStatus}
        </span>
      </div>
    </div>
  );
};
