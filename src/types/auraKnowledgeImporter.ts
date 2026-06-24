import type {
    AuraLanguage,
    AuraSystem,
    AuraKnowledgeStatus,
  } from './auraIntelligence';
  
  export type AuraImportSourceType =
    | 'txt'
    | 'markdown'
    | 'pdf'
    | 'docx'
    | 'manual';
  
  export type AuraImportChunkStatus =
    | 'pending'
    | 'ready'
    | 'imported'
    | 'skipped'
    | 'error';
  
  export interface AuraKnowledgeImportContext {
    tenantId: string;
    companyId: string;
    createdBy: string;
    system: AuraSystem;
    module: string;
    category: string;
    language: AuraLanguage;
    status: AuraKnowledgeStatus;
  }
  
  export interface AuraKnowledgeImportChunk {
    id: string;
    title: string;
    content: string;
    tags: string[];
    status: AuraImportChunkStatus;
    error?: string;
  }
  
  export interface AuraKnowledgeImportPreview {
    sourceType: AuraImportSourceType;
    sourceName: string;
    chunks: AuraKnowledgeImportChunk[];
    context: AuraKnowledgeImportContext;
  }
  
  export interface AuraKnowledgeImportResult {
    total: number;
    imported: number;
    skipped: number;
    errors: number;
    articleIds: string[];
  }