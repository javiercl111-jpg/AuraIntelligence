import React from 'react';

import type { AuraSystemId } from '../types/auraModules';

import {
  listAuraModulesBySystem,
} from '../services/auraModulesRegistryService';

type AuraModuleSelectProps = {
  system: AuraSystemId;
  value: string;
  onChange: (value: string) => void;
};

const AuraModuleSelect: React.FC<AuraModuleSelectProps> = ({
  system,
  value,
  onChange,
}) => {
  const modules = listAuraModulesBySystem(system);

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-blue-400"
    >
      <option value="">Selecciona un módulo</option>

      {modules.map((module) => (
        <option
          key={`${module.system}_${module.id}`}
          value={module.id}
        >
          {module.name}
        </option>
      ))}
    </select>
  );
};

export default AuraModuleSelect;