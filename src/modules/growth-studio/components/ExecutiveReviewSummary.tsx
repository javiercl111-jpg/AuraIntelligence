import React from 'react';
import type { ExecutiveReviewReport } from '../types';
import { ReviewScoreCard } from './ReviewScoreCard';
import { StrengthsCard } from './StrengthsCard';
import { WeaknessesCard } from './WeaknessesCard';
import { ViolationsCard } from './ViolationsCard';
import { RecommendationsCard } from './RecommendationsCard';
import { TraceabilityCoverageCard } from './TraceabilityCoverageCard';
import { GovernanceComplianceCard } from './GovernanceComplianceCard';

interface ExecutiveReviewSummaryProps {
  report: ExecutiveReviewReport;
}

export const ExecutiveReviewSummary: React.FC<ExecutiveReviewSummaryProps> = ({ report }) => {
  return (
    <div className="flex flex-col space-y-6 w-full max-w-5xl mx-auto p-4">

      <div className="bg-slate-900 text-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-2">Executive Review Report</h2>
        <p className="text-slate-300 mb-1">
          <strong>Review ID:</strong> {report.reviewId} | <strong>Draft ID:</strong> {report.draftId}
        </p>
        <p className="text-slate-300">
          <strong>Executive Summary:</strong> {report.executiveSummary}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <ReviewScoreCard report={report} />
          <div className="flex space-x-4 mt-6">
            <TraceabilityCoverageCard coverage={report.traceabilityCoverage} />
            <GovernanceComplianceCard compliance={report.governanceCompliance} />
          </div>
        </div>
        <div className="md:col-span-2 flex flex-col space-y-6">
          <ViolationsCard violations={report.violations} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <StrengthsCard strengths={report.strengths} />
            <WeaknessesCard weaknesses={report.weaknesses} />
          </div>
          <RecommendationsCard recommendations={report.recommendations} />
        </div>
      </div>

    </div>
  );
};
