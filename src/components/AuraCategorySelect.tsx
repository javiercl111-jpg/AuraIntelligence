import React from 'react';

import type { AuraSystemId } from '../types/auraModules';

import {
  listAuraKnowledgeCategoriesByModule,
} from '../services/auraKnowledgeCategoriesService';

type AuraCategorySelectProps = {
  system: AuraSystemId;
  moduleId?: string;
  value: string;
  onChange: (value: string) => void;
};

const AuraCategorySelect: React.FC<AuraCategorySelectProps> = ({
  system,
  moduleId,
  value,
  onChange,
}) => {
  const categories = listAuraKnowledgeCategoriesByModule(
    system,
    moduleId
  );

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-blue-400"
    >
      <option value="">Selecciona una categoría</option>

      {categories.map((category) => (
        <option
          key={`${category.system}_${category.id}`}
          value={category.id}
        >
          {category.name}
        </option>
      ))}
    </select>
  );
};

export default AuraCategorySelect;