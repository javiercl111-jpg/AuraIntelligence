import React from 'react';

interface TraceabilityCoverageCardProps {
  coverage: number; // 0-100
}

export const TraceabilityCoverageCard: React.FC<TraceabilityCoverageCardProps> = ({ coverage }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col items-center justify-center">
      <h3 className="text-sm font-semibold text-slate-600 mb-2">Traceability Coverage</h3>
      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-slate-100"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className={coverage === 100 ? "text-green-500" : coverage > 50 ? "text-yellow-500" : "text-red-500"}
            strokeDasharray={`${coverage}, 100`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
        </svg>
        <span className="absolute text-xl font-bold text-slate-700">{coverage}%</span>
      </div>
    </div>
  );
};
