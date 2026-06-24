import {
    createKnowledgeArticle,
  } from './auraKnowledgeAdminService';
  
  import type {
    AuraKnowledgeImportContext,
    AuraKnowledgeImportPreview,
    AuraKnowledgeImportResult,
    AuraKnowledgeImportChunk,
    AuraImportSourceType,
  } from '../types/auraKnowledgeImporter';
  
  const MAX_CHUNK_LENGTH = 1200;
  
  const createChunkId = (index: number): string => {
    return `chunk_${index + 1}`;
  };
  
  const normalizeText = (value: unknown): string =>
    String(value || '')
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  
  const splitTextIntoChunks = (text: string): AuraKnowledgeImportChunk[] => {
    const normalizedText = normalizeText(text);
  
    if (!normalizedText) return [];
  
    const paragraphs = normalizedText
      .split(/\n\s*\n/g)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  
    const chunks: string[] = [];
    let currentChunk = '';
  
    paragraphs.forEach((paragraph) => {
      const nextChunk = currentChunk
        ? `${currentChunk}\n\n${paragraph}`
        : paragraph;
  
      if (nextChunk.length > MAX_CHUNK_LENGTH && currentChunk) {
        chunks.push(currentChunk);
        currentChunk = paragraph;
        return;
      }
  
      currentChunk = nextChunk;
    });
  
    if (currentChunk) {
      chunks.push(currentChunk);
    }
  
    return chunks.map((chunk, index) => {
      const firstLine = chunk.split('\n')[0]?.trim() || `Artículo ${index + 1}`;
  
      return {
        id: createChunkId(index),
        title: firstLine.slice(0, 90),
        content: chunk,
        tags: [],
        status: 'ready',
      };
    });
  };
  
  export const buildKnowledgeImportPreviewFromText = ({
    sourceName,
    sourceType,
    text,
    context,
  }: {
    sourceName: string;
    sourceType: AuraImportSourceType;
    text: string;
    context: AuraKnowledgeImportContext;
  }): AuraKnowledgeImportPreview => {
    return {
      sourceName,
      sourceType,
      context,
      chunks: splitTextIntoChunks(text),
    };
  };
  
  export const importKnowledgePreview = async (
    preview: AuraKnowledgeImportPreview
  ): Promise<AuraKnowledgeImportResult> => {
    const result: AuraKnowledgeImportResult = {
      total: preview.chunks.length,
      imported: 0,
      skipped: 0,
      errors: 0,
      articleIds: [],
    };
  
    for (const chunk of preview.chunks) {
      if (chunk.status === 'skipped') {
        result.skipped += 1;
        continue;
      }
  
      if (!chunk.title.trim() || !chunk.content.trim()) {
        result.skipped += 1;
        continue;
      }
  
      try {
        const articleId = await createKnowledgeArticle({
          tenantId: preview.context.tenantId,
          companyId: preview.context.companyId,
          createdBy: preview.context.createdBy,
          title: chunk.title,
          content: chunk.content,
          system: preview.context.system,
          module: preview.context.module,
          category: preview.context.category,
          language: preview.context.language,
          status: preview.context.status,
          tags: chunk.tags,
        } as any);
  
        result.imported += 1;
        result.articleIds.push(articleId);
      } catch (error) {
        console.error('[Aura Intelligence] Import chunk error:', error);
        result.errors += 1;
      }
    }
  
    return result;
  };