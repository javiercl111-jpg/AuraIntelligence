import type { AuraKnowledgeArticle } from '../types/auraIntelligence';

const MAX_RELATED_ARTICLES = 3;

const normalizeText = (value: unknown): string =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const removeDuplicateArticles = (
  articles: AuraKnowledgeArticle[]
): AuraKnowledgeArticle[] => {
  const seen = new Set<string>();

  return articles.filter((article) => {
    const key = article.id || normalizeText(`${article.title}_${article.content}`);

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
};

export const composeAuraAnswer = (
  articles: AuraKnowledgeArticle[]
): string => {
  const uniqueArticles = removeDuplicateArticles(articles);
  const primaryArticle = uniqueArticles[0];

  if (!primaryArticle) {
    return 'No encontré información suficiente en la base de conocimiento de Aura. Intenta reformular la pregunta o contacta al administrador.';
  }

  return primaryArticle.content;
};

export const getRelatedAuraArticles = (
  articles: AuraKnowledgeArticle[]
): AuraKnowledgeArticle[] => {
  const uniqueArticles = removeDuplicateArticles(articles);

  return uniqueArticles.slice(1, MAX_RELATED_ARTICLES + 1);
};