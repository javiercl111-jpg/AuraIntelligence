import type {
    AuraModuleDefinition,
    AuraSystemId,
  } from '../types/auraModules';
  
  import {
    ALL_AURA_MODULES,
  } from '../types/auraModules';
  
  export const listAuraModules = (): AuraModuleDefinition[] => {
    return ALL_AURA_MODULES;
  };
  
  export const listAuraModulesBySystem = (
    system: AuraSystemId
  ): AuraModuleDefinition[] => {
    return ALL_AURA_MODULES.filter((module) => module.system === system);
  };
  
  export const findAuraModuleById = (
    moduleId: string,
    system?: AuraSystemId
  ): AuraModuleDefinition | null => {
    const normalizedModuleId = String(moduleId || '').trim();
  
    if (!normalizedModuleId) return null;
  
    return (
      ALL_AURA_MODULES.find((module) => {
        const sameId = module.id === normalizedModuleId;
        const sameSystem = system ? module.system === system : true;
  
        return sameId && sameSystem;
      }) || null
    );
  };
  
  export const getAuraModuleLabel = (
    moduleId: string,
    system?: AuraSystemId
  ): string => {
    const module = findAuraModuleById(moduleId, system);
  
    return module?.name || moduleId;
  };