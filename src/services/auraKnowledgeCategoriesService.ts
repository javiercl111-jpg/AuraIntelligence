import type {
    AuraKnowledgeCategoryDefinition,
  } from '../types/auraKnowledgeCategories';
  
  import type { AuraSystemId } from '../types/auraModules';
  
  import {
    ALL_AURA_KNOWLEDGE_CATEGORIES,
  } from '../types/auraKnowledgeCategories';
  
  export const listAuraKnowledgeCategories = (): AuraKnowledgeCategoryDefinition[] => {
    return ALL_AURA_KNOWLEDGE_CATEGORIES;
  };
  
  export const listAuraKnowledgeCategoriesBySystem = (
    system: AuraSystemId
  ): AuraKnowledgeCategoryDefinition[] => {
    return ALL_AURA_KNOWLEDGE_CATEGORIES.filter(
      (category) => category.system === system
    );
  };
  
  export const listAuraKnowledgeCategoriesByModule = (
    system: AuraSystemId,
    moduleId?: string
  ): AuraKnowledgeCategoryDefinition[] => {
    const categories = listAuraKnowledgeCategoriesBySystem(system);
  
    if (!moduleId) return categories;
  
    return categories.filter((category) => {
      if (!category.moduleIds?.length) return true;
  
      return category.moduleIds.includes(moduleId);
    });
  };
  
  export const findAuraKnowledgeCategoryById = (
    categoryId: string,
    system?: AuraSystemId
  ): AuraKnowledgeCategoryDefinition | null => {
    const normalizedCategoryId = String(categoryId || '').trim();
  
    if (!normalizedCategoryId) return null;
  
    return (
      ALL_AURA_KNOWLEDGE_CATEGORIES.find((category) => {
        const sameId = category.id === normalizedCategoryId;
        const sameSystem = system ? category.system === system : true;
  
        return sameId && sameSystem;
      }) || null
    );
  };
  
  export const getAuraKnowledgeCategoryLabel = (
    categoryId: string,
    system?: AuraSystemId
  ): string => {
    const category = findAuraKnowledgeCategoryById(categoryId, system);
  
    return category?.name || categoryId;
  };