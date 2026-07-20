import React from 'react';
import type { CampaignStrategyField } from '../types/campaignStrategy';

interface CampaignStrategyCardProps {
  label: string;
  field: CampaignStrategyField<unknown>;
}

export const CampaignStrategyCard: React.FC<CampaignStrategyCardProps> = ({ label, field }) => {
  const getStatusColor = () => {
    switch (field.status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'inferred': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'missing': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (field.status) {
      case 'confirmed': return '✓';
      case 'inferred': return '💡';
      case 'missing': return '⚠️';
      default: return '•';
    }
  };

  let displayValue = 'No definido';
  if (field.value !== null && field.value !== undefined) {
    displayValue = Array.isArray(field.value) ? field.value.join(', ') : String(field.value);
  }

  return (
    <div className={`p-4 rounded-xl border ${getStatusColor()} flex flex-col gap-2 transition-all`}>
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm opacity-80 uppercase tracking-wider">{label}</span>
        <span className="text-xl" title={`Estado: ${field.status}`}>{getStatusIcon()}</span>
      </div>
      <p className="text-lg font-medium leading-tight">
        {displayValue}
      </p>
      {field.evidence && (
        <p className="text-xs opacity-70 italic mt-1 border-t border-black/10 pt-1">
          <strong>Evidencia:</strong> {field.evidence}
        </p>
      )}
    </div>
  );
};

export default CampaignStrategyCard;
