import React from 'react';
import type { NextGenerationAction } from '../types/executiveContentBrief';
import { Sparkles, CheckCircle, Search } from 'lucide-react';

interface NextGenerationActionCardProps {
  action: NextGenerationAction;
  onExecute?: () => void;
}

export const NextGenerationActionCard: React.FC<NextGenerationActionCardProps> = ({ action, onExecute }) => {
  const getIcon = () => {
    switch (action.action) {
      case 'generate_asset': return <Sparkles className="w-5 h-5 text-indigo-500" />;
      case 'approve_brief': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'review_brief': return <Search className="w-5 h-5 text-amber-500" />;
      default: return null;
    }
  };

  const getStyle = () => {
    switch (action.action) {
      case 'generate_asset': return 'bg-indigo-50 border-indigo-200 text-indigo-700';
      case 'approve_brief': return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'review_brief': return 'bg-amber-50 border-amber-200 text-amber-700';
      default: return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  const getButtonStyle = () => {
    if (!action.isEnabled) return 'bg-slate-300 text-slate-500 cursor-not-allowed';
    switch (action.action) {
      case 'generate_asset': return 'bg-indigo-600 hover:bg-indigo-700 text-white';
      case 'approve_brief': return 'bg-emerald-600 hover:bg-emerald-700 text-white';
      case 'review_brief': return 'bg-amber-600 hover:bg-amber-700 text-white';
      default: return 'bg-slate-600 hover:bg-slate-700 text-white';
    }
  };

  return (
    <div className={`p-4 border rounded-xl flex items-center justify-between ${getStyle()}`}>
      <div className="flex items-center gap-3">
        {getIcon()}
        <div>
          <h4 className="text-sm font-semibold">{action.label}</h4>
          {action.blockingReason && (
            <p className="text-xs opacity-80 mt-0.5">{action.blockingReason}</p>
          )}
        </div>
      </div>
      <button
        onClick={onExecute}
        disabled={!action.isEnabled}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${getButtonStyle()}`}
      >
        {action.label}
      </button>
    </div>
  );
};
