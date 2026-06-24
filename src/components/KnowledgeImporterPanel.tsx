import React, { useState } from 'react';

import {
  buildKnowledgeImportPreviewFromText,
  importKnowledgePreview,
} from '../services/auraKnowledgeImporterService';

import type {
  AuraKnowledgeImportPreview,
} from '../types/auraKnowledgeImporter';

const KnowledgeImporterPanel: React.FC = () => {
  const [sourceName, setSourceName] = useState('');
  const [content, setContent] = useState('');
  const [preview, setPreview] =
    useState<AuraKnowledgeImportPreview | null>(null);

  const [isImporting, setIsImporting] = useState(false);

  const handleGeneratePreview = () => {
    if (!sourceName.trim() || !content.trim()) {
      alert('Nombre y contenido son obligatorios.');
      return;
    }

    const nextPreview = buildKnowledgeImportPreviewFromText({
      sourceName,
      sourceType: 'manual',
      text: content,
      context: {
        tenantId: 'aura_demo',
        companyId: 'aura_demo',
        createdBy: 'demo_admin',
        system: 'aura_hcm',
        module: 'employees',
        category: 'employee_management',
        language: 'es',
        status: 'published',
      },
    });

    setPreview(nextPreview);
  };

  const handleImport = async () => {
    if (!preview) return;

    try {
      setIsImporting(true);

      const result = await importKnowledgePreview(preview);

      alert(
        `Importación finalizada.\n\nImportados: ${result.imported}\nErrores: ${result.errors}`
      );

      setPreview(null);
      setContent('');
      setSourceName('');
    } catch (error) {
      console.error(
        '[Aura Intelligence] Knowledge import error:',
        error
      );

      alert('No fue posible completar la importación.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <h2 className="text-xl font-black">
        Knowledge Importer
      </h2>

      <p className="mt-2 text-sm text-white/60">
        Permite convertir documentación extensa en artículos de conocimiento.
      </p>

      <div className="mt-5 grid gap-4">
        <input
          value={sourceName}
          onChange={(event) => setSourceName(event.target.value)}
          placeholder="Nombre del documento"
          className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
        />

        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={12}
          placeholder="Pega aquí el contenido del manual, procedimiento o documentación..."
          className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
        />

        <button
          type="button"
          onClick={handleGeneratePreview}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-500"
        >
          Generar vista previa
        </button>
      </div>

      {preview && (
        <div className="mt-6">
          <div className="mb-4 rounded-xl bg-white/5 p-4">
            <p className="font-bold">
              Artículos detectados: {preview.chunks.length}
            </p>
          </div>

          <div className="space-y-3">
            {preview.chunks.map((chunk) => (
              <div
                key={chunk.id}
                className="rounded-xl border border-white/10 p-4"
              >
                <h3 className="font-bold">
                  {chunk.title}
                </h3>

                <p className="mt-2 text-sm text-white/60">
                  {chunk.content.slice(0, 300)}
                  {chunk.content.length > 300 ? '...' : ''}
                </p>
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled={isImporting}
            onClick={() => void handleImport()}
            className="mt-5 rounded-xl bg-green-600 px-5 py-3 text-sm font-black text-white hover:bg-green-500 disabled:opacity-50"
          >
            {isImporting
              ? 'Importando...'
              : 'Importar artículos'}
          </button>
        </div>
      )}
    </section>
  );
};

export default KnowledgeImporterPanel;