import React, { useEffect, useState } from 'react';

import {
  deleteKnowledgeArticle,
  listKnowledgeArticles,
} from '../services/auraKnowledgeAdminService';

import type { AuraKnowledgeArticle } from '../types/auraIntelligence';

const KnowledgeArticleList: React.FC = () => {
  const [articles, setArticles] = useState<AuraKnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const loadArticles = async () => {
    try {
      setLoading(true);

      const data = await listKnowledgeArticles();

      setArticles(data);
    } catch (error) {
      console.error(
        '[Aura Intelligence] Error loading knowledge articles:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (articleId: string) => {
    const confirmed = window.confirm(
      '¿Deseas eliminar este artículo?'
    );

    if (!confirmed) return;

    try {
      await deleteKnowledgeArticle(articleId);

      await loadArticles();
    } catch (error) {
      console.error(
        '[Aura Intelligence] Error deleting article:',
        error
      );
    }
  };

  useEffect(() => {
    void loadArticles();
  }, []);

  if (loading) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <p className="text-sm text-white/60">
          Cargando artículos...
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-black">
          Artículos registrados
        </h2>

        <span className="rounded-xl bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-200">
          {articles.length} artículos
        </span>
      </div>

      {articles.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-white/50">
          Aún no existen artículos registrados.
        </div>
      )}

      <div className="space-y-4">
        {articles.map((article) => (
          <article
            key={article.id}
            className="rounded-xl border border-white/10 bg-black/20 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-bold">
                  {article.title}
                </h3>

                <p className="mt-1 text-xs text-white/50">
                  {article.system}
                  {article.module
                    ? ` • ${article.module}`
                    : ''}
                  {article.category
                    ? ` • ${article.category}`
                    : ''}
                </p>
              </div>

              <span className="rounded-lg bg-white/10 px-2 py-1 text-xs">
                {article.status}
              </span>
            </div>

            <p className="mt-3 line-clamp-4 text-sm text-white/70">
              {article.content}
            </p>

            {!!article.tags?.length && (
              <div className="mt-3 flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-lg bg-blue-500/10 px-2 py-1 text-xs text-blue-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => void handleDelete(article.id)}
                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-500"
              >
                Eliminar
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default KnowledgeArticleList;