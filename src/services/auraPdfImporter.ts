import * as pdfjsLib from 'pdfjs-dist';

import {
  buildKnowledgeImportPreviewFromText,
} from './auraKnowledgeImporterService';

import type {
  AuraKnowledgeImportContext,
  AuraKnowledgeImportPreview,
} from '../types/auraKnowledgeImporter';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const extractPdfText = async (
  file: File
): Promise<string> => {
  const buffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: buffer,
  }).promise;

  let fullText = '';

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);

    const content = await page.getTextContent();

    const pageText = content.items
      .map((item: any) => item.str || '')
      .join(' ');

    fullText += `\n\n${pageText}`;
  }

  return fullText.trim();
};

export const buildKnowledgeImportPreviewFromPdf = async ({
  file,
  context,
}: {
  file: File;
  context: AuraKnowledgeImportContext;
}): Promise<AuraKnowledgeImportPreview> => {
  const text = await extractPdfText(file);

  return buildKnowledgeImportPreviewFromText({
    sourceName: file.name,
    sourceType: 'pdf',
    text,
    context,
  });
};