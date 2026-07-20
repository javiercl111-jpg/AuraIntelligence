import React from 'react';
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';

interface ExecutionReadinessIndicatorProps {
  score: number;
  reason: string;
  isBlocked: boolean;
}

export const ExecutionReadinessIndicator: React.FC<ExecutionReadinessIndicatorProps> = ({ score, reason, isBlocked }) => {
  let color = 'bg-blue-500';
  let textColor = 'text-blue-400';
  let Icon = Shield;
  
  if (isBlocked) {
    color = 'bg-red-500';
    textColor = 'text-red-400';
    Icon = ShieldAlert;
  } else if (score >= 80) {
    color = 'bg-emerald-500';
    textColor = 'text-emerald-400';
    Icon = ShieldCheck;
  } else if (score >= 50) {
    color = 'bg-yellow-500';
    textColor = 'text-yellow-400';
    Icon = Shield;
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Icon className={textColor} size={24} />
          <h3 className="text-lg font-bold text-white">Execution Readiness</h3>
        </div>
        <div className={`text-2xl font-black ${textColor}`}>
          {isBlocked ? 'BLOQUEADO' : `${score}%`}
        </div>
      </div>
      
      {!isBlocked && (
        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden mb-4">
          <div 
            className={`h-full ${color} transition-all duration-1000`} 
            style={{ width: `${score}%` }} 
          />
        </div>
      )}
      
      <p className="text-sm text-white/60">{reason}</p>
    </div>
  );
};
