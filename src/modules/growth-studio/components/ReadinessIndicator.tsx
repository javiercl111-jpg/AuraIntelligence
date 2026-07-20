import React from 'react';

interface ReadinessIndicatorProps {
  score: number;
  reason: string;
}

export const ReadinessIndicator: React.FC<ReadinessIndicatorProps> = ({ score, reason }) => {
  let color = 'bg-red-500';
  let label = 'No preparado';
  
  if (score >= 40 && score < 80) {
    color = 'bg-yellow-500';
    label = 'En revisión';
  } else if (score >= 80) {
    color = 'bg-green-500';
    label = 'Listo para Lanzamiento';
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Readiness Score</h3>
        <span className={`px-3 py-1 rounded-full text-white text-sm font-semibold ${color}`}>
          {label}
        </span>
      </div>
      
      <div className="relative pt-1">
        <div className="flex mb-2 items-center justify-between">
          <div>
            <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-200">
              Preparación Estratégica
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold inline-block text-indigo-600">
              {score}%
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-100">
          <div style={{ width: `${score}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${color} transition-all duration-1000`}></div>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 italic">
        {reason}
      </p>
    </div>
  );
};

export default ReadinessIndicator;
