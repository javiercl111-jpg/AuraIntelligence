import React from 'react';

import KnowledgeArticleForm from '../components/KnowledgeArticleForm';
import KnowledgeImporterPanel from '../components/KnowledgeImporterPanel';
import KnowledgeImportCenter from '../components/KnowledgeImportCenter';
import KnowledgeArticleList from '../components/KnowledgeArticleList';

const KnowledgeCenterPage: React.FC = () => {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-blue-300">
        Aura Intelligence
      </p>

      <h2 className="mt-3 text-2xl font-black">
        Knowledge Center
      </h2>

      <p className="mt-3 text-sm leading-relaxed text-white/60">
        Centro de conocimiento documental de Aura Intelligence. Aquí se
        administran artículos, guías, preguntas frecuentes y flujos de soporte
        para Aura HCM, Aura Maintenance OS, Aura Signature y futuros sistemas.
      </p>

      <div className="mt-6 grid gap-6">
        <KnowledgeArticleForm />

        <KnowledgeImporterPanel />

        <KnowledgeImportCenter />

        <KnowledgeArticleList />
      </div>
    </section>
  );
};

export default KnowledgeCenterPage;