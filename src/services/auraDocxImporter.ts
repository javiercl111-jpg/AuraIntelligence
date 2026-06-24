import {
    buildKnowledgeImportPreviewFromText,
  } from './auraKnowledgeImporterService';
  
  import type {
    AuraKnowledgeImportContext,
    AuraKnowledgeImportPreview,
  } from '../types/auraKnowledgeImporter';
  
  /**
   * V1
   * Preparado para DOCX.
   * En la siguiente fase conectaremos mammoth o docx parser.
   */
  
  const extractDocxText = async (
    file: File
  ): Promise<string> => {
    const text = await file.text();
  
    return text;
  };
  
  export const buildKnowledgeImportPreviewFromDocx = async ({
    file,
    context,
  }: {
    file: File;
    context: AuraKnowledgeImportContext;
  }): Promise<AuraKnowledgeImportPreview> => {
    const text = await extractDocxText(file);
  
    return buildKnowledgeImportPreviewFromText({
      sourceName: file.name,
      sourceType: 'docx',
      text,
      context,
    });
  };