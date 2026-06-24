import React, { useState } from 'react';

import {
  importKnowledgePreview,
} from '../services/auraKnowledgeImporterService';

import {
  buildKnowledgeImportPreviewFromPdf,
} from '../services/auraPdfImporter';

import {
  buildKnowledgeImportPreviewFromDocx,
} from '../services/auraDocxImporter';

import type {
  AuraKnowledgeImportPreview,
} from '../types/auraKnowledgeImporter';

const KnowledgeImportCenter: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<AuraKnowledgeImportPreview | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleBuildPreview = async () => {
    if (!file) {
      alert('Selecciona un archivo.');
      return;
    }

    setIsProcessing(true);

    try {
      const context = {
        tenantId: 'aura_demo',
        companyId: 'aura_demo',
        createdBy: 'demo_admin',
        system: 'aura_hcm' as const,
        module: 'employees',
        category: 'employee_management',
        language: 'es' as const,
        status: 'published' as const,
      };

      const lowerName = file.name.toLowerCase();

      const nextPreview = lowerName.endsWith('.pdf')
        ? await buildKnowledgeImportPreviewFromPdf({ file, context })
        : await buildKnowledgeImportPreviewFromDocx({ file, context });

      setPreview(nextPreview);
    } catch (error) {
      console.error('[Aura Intelligence] Import preview error:', error);
      alert('No se pudo procesar el archivo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!preview) return;

    setIsImporting(true);

    try {
      const result = await importKnowledgePreview(preview);

      alert(
        `Importación finalizada.\n\nImportados: ${result.imported}\nErrores: ${result.errors}`
      );

      setPreview(null);
      setFile(null);

      window.dispatchEvent(new CustomEvent('aura:intelligence:knowledge-updated'));
    } catch (error) {
      console.error('[Aura Intelligence] Import error:', error);
      alert('No se pudo importar el documento.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <h2 className="text-xl font-black">
        Knowledge Import Center
      </h2>

      <p className="mt-2 text-sm text-white/60">
        Importa documentos PDF o DOCX para generar artículos de conocimiento.
      </p>

      <div className="mt-5 grid gap-4">
        <input
          type="file"
          accept=".pdf,.docx,.txt,.md"
          onChange={(event) => {
            setFile(event.target.files?.[0] || null);
            setPreview(null);
          }}
          className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white"
        />

        <button
          type="button"
          onClick={() => void handleBuildPreview()}
          disabled={!file || isProcessing}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {isProcessing ? 'Procesando...' : 'Generar vista previa'}
        </button>
      </div>

      {preview && (
        <div className="mt-6">
          <div className="rounded-xl bg-white/5 p-4">
            <p className="font-bold">
              Documento: {preview.sourceName}
            </p>
            <p className="mt-1 text-sm text-white/60">
              Artículos detectados: {preview.chunks.length}
            </p>
          </div>

          <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {preview.chunks.map((chunk) => (
              <article
                key={chunk.id}
                className="rounded-xl border border-white/10 bg-black/20 p-4"
              >
                <h3 className="font-bold">
                  {chunk.title}
                </h3>

                <p className="mt-2 text-sm text-white/60">
                  {chunk.content.slice(0, 400)}
                  {chunk.content.length > 400 ? '...' : ''}
                </p>
              </article>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void handleImport()}
            disabled={isImporting}
            className="mt-5 rounded-xl bg-green-600 px-5 py-3 text-sm font-black text-white hover:bg-green-500 disabled:opacity-50"
          >
            {isImporting ? 'Importando...' : 'Importar artículos'}
          </button>
        </div>
      )}
    </section>
  );
};

export default KnowledgeImportCenter;