import React, { useEffect, useState } from 'react';

import AuraModuleSelect from './AuraModuleSelect';

import { createKnowledgeArticle } from '../services/auraKnowledgeAdminService';

import type {
  AuraLanguage,
  AuraSystem,
  AuraKnowledgeStatus,
} from '../types/auraIntelligence';

import type { AuraSystemId } from '../types/auraModules';

const DEFAULT_COMPANY_ID = 'aura_demo';
const DEFAULT_TENANT_ID = 'aura_demo';
const DEFAULT_CREATED_BY = 'demo_admin';

const isRegistrySystem = (value: AuraSystem): value is AuraSystemId => {
  return [
    'aura_hcm',
    'aura_maintenance',
    'aura_signature',
    'aura_control_center',
    'aura_intelligence',
  ].includes(value);
};

const KnowledgeArticleForm: React.FC = () => {
  const [title, setTitle] = useState('');
  const [system, setSystem] = useState<AuraSystem>('aura_hcm');
  const [module, setModule] = useState('');
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState<AuraLanguage>('es');
  const [status, setStatus] = useState<AuraKnowledgeStatus>('draft');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setModule('');
  }, [system]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Título y contenido son obligatorios.');
      return;
    }

    setIsSaving(true);

    try {
      await createKnowledgeArticle({
        tenantId: DEFAULT_TENANT_ID,
        companyId: DEFAULT_COMPANY_ID,
        createdBy: DEFAULT_CREATED_BY,
        title: title.trim(),
        content: content.trim(),
        system,
        module: module.trim(),
        category: category.trim(),
        language,
        status,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      } as any);

      setTitle('');
      setModule('');
      setCategory('');
      setTags('');
      setContent('');
      setStatus('draft');

      alert('Artículo guardado correctamente.');

      window.dispatchEvent(new CustomEvent('aura:intelligence:knowledge-updated'));
    } catch (error) {
      console.error('[Aura Intelligence] Error saving article:', error);
      alert('No se pudo guardar el artículo. Revisa permisos de Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <h2 className="text-xl font-black">Nuevo artículo</h2>

      <div className="mt-5 grid gap-4">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Título del artículo"
          className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-blue-400"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <select
            value={system}
            onChange={(event) => setSystem(event.target.value as AuraSystem)}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-blue-400"
          >
            <option value="aura_hcm">Aura HCM</option>
            <option value="aura_maintenance">Aura Maintenance OS</option>
            <option value="aura_signature">Aura Signature</option>
            <option value="aura_control_center">Aura Control Center</option>
            <option value="aura_intelligence">Aura Intelligence</option>
          </select>

          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as AuraLanguage)}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-blue-400"
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {isRegistrySystem(system) ? (
            <AuraModuleSelect
              system={system}
              value={module}
              onChange={setModule}
            />
          ) : (
            <input
              value={module}
              onChange={(event) => setModule(event.target.value)}
              placeholder="Módulo"
              className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-blue-400"
            />
          )}

          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Categoría"
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-blue-400"
          />

          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as AuraKnowledgeStatus)
            }
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-blue-400"
          >
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            <option value="archived">Archivado</option>
          </select>
        </div>

        <input
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="Tags separados por coma. Ejemplo: nómina, empleados, permisos"
          className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-blue-400"
        />

        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Contenido del artículo / respuesta oficial"
          rows={8}
          className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-blue-400"
        />

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? 'Guardando...' : 'Guardar artículo'}
        </button>
      </div>
    </section>
  );
};

export default KnowledgeArticleForm;