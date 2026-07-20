import React from 'react';
import type { StrategicPhase } from '../types/executiveExecutionPlan';
import { CheckCircle2, Circle, AlertCircle, Clock } from 'lucide-react';

interface ExecutionTimelineProps {
  phases: StrategicPhase[];
}

export const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({ phases }) => {
  return (
    <div className="relative border-l border-white/10 ml-4 pl-6 space-y-6">
      {phases.map(phase => {
        const isBlocked = phase.state === 'blocked';
        const isReady = phase.state === 'ready';
        const isCompleted = phase.state === 'completed';
        const inProgress = phase.state === 'in_progress';

        let Icon = Circle;
        let colorClass = 'text-white/30';

        if (isCompleted) {
          Icon = CheckCircle2;
          colorClass = 'text-emerald-400';
        } else if (inProgress) {
          Icon = Clock;
          colorClass = 'text-blue-400';
        } else if (isBlocked) {
          Icon = AlertCircle;
          colorClass = 'text-red-400';
        } else if (isReady) {
          Icon = Circle;
          colorClass = 'text-emerald-400';
        }

        return (
          <div key={phase.id} className="relative">
            <div className={`absolute -left-[35px] bg-[#0d1117] p-1 ${colorClass}`}>
              <Icon size={16} />
            </div>
            <div>
              <h4 className={`text-sm font-bold ${isBlocked ? 'text-red-400' : 'text-white'}`}>
                {phase.label}
              </h4>
              <p className="text-xs text-white/50 mt-1 capitalize">{phase.state.replace('_', ' ')}</p>

              {phase.actions.length > 0 && (
                <div className="mt-2 text-xs text-white/70 space-y-1">
                  {phase.actions.map(action => (
                    <div key={action.id} className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-white/30" />
                      <span>{action.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
