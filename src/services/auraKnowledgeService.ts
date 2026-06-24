import {
    collection,
    getDocs,
    query,
    where,
    limit,
  } from 'firebase/firestore';
  
  import { db } from '../firebase';
  
  import type {
    AuraKnowledgeArticle,
    AuraSystem,
  } from '../types/auraIntelligence';
  
  const KNOWLEDGE_COLLECTION = 'ai_knowledge_articles';
  
  const STOP_WORDS = new Set([
    'como',
    'cómo',
    'que',
    'qué',
    'para',
    'por',
    'una',
    'uno',
    'unos',
    'unas',
    'el',
    'la',
    'los',
    'las',
    'de',
    'del',
    'al',
    'en',
    'y',
    'o',
    'un',
    'me',
    'mi',
    'mis',
    'se',
    'lo',
  ]);
  
  const COMMON_SYNONYMS: Record<string, string[]> = {
    nomina: ['nomna', 'nomiina', 'nominas', 'payroll'],
    vacaciones: ['vacasiones', 'vacaciones', 'vacacion', 'vacation'],
    recibos: ['resivos', 'recivos', 'recibo', 'recibos'],
    incapacidad: ['incapasidad', 'incapacidades', 'incapacity'],
    permisos: ['permiso', 'permisos', 'permizos'],
    offline: ['ofline', 'offline', 'sinconexion', 'sin-conexion'],
    empleados: ['empleado', 'empleados', 'colaborador', 'colaboradores'],
    ordenes: ['orden', 'ordenes', 'órdenes', 'workorder', 'workorders'],
  };
  
  const normalizeText = (value: unknown): string =>
    String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  
  const normalizeToken = (value: string): string => {
    const token = normalizeText(value);
  
    const synonymEntry = Object.entries(COMMON_SYNONYMS).find(([, variants]) =>
      variants.map(normalizeText).includes(token)
    );
  
    if (synonymEntry) {
      return synonymEntry[0];
    }
  
    if (token.endsWith('ando') || token.endsWith('iendo')) {
      return token.slice(0, -4);
    }
  
    if (token.endsWith('ar') || token.endsWith('er') || token.endsWith('ir')) {
      return token.slice(0, -2);
    }
  
    if (token.endsWith('es') && token.length > 5) {
      return token.slice(0, -2);
    }
  
    if (token.endsWith('s') && token.length > 4) {
      return token.slice(0, -1);
    }
  
    if (token.endsWith('o') || token.endsWith('a') || token.endsWith('e')) {
      return token.slice(0, -1);
    }
  
    return token;
  };
  
  const levenshteinDistance = (left: string, right: string): number => {
    const a = normalizeText(left);
    const b = normalizeText(right);
  
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
  
    const matrix = Array.from({ length: a.length + 1 }, (_, row) =>
      Array.from({ length: b.length + 1 }, (_, col) =>
        row === 0 ? col : col === 0 ? row : 0
      )
    );
  
    for (let row = 1; row <= a.length; row += 1) {
      for (let col = 1; col <= b.length; col += 1) {
        const cost = a[row - 1] === b[col - 1] ? 0 : 1;
  
        matrix[row][col] = Math.min(
          matrix[row - 1][col] + 1,
          matrix[row][col - 1] + 1,
          matrix[row - 1][col - 1] + cost
        );
      }
    }
  
    return matrix[a.length][b.length];
  };
  
  const areTokensSimilar = (left: string, right: string): boolean => {
    const a = normalizeToken(left);
    const b = normalizeToken(right);
  
    if (a === b) return true;
    if (a.length < 4 || b.length < 4) return false;
  
    if (a.includes(b) || b.includes(a)) return true;
  
    const distance = levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
  
    if (maxLength <= 5) return distance <= 1;
  
    return distance <= 2;
  };
  
  const tokenize = (text: string): string[] =>
    normalizeText(text)
      .split(' ')
      .map(normalizeToken)
      .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
  
  const buildArticleTokens = (article: AuraKnowledgeArticle): string[] =>
    tokenize([
      article.title,
      article.content,
      ...(article.tags || []),
      article.category || '',
      article.module || '',
      article.system || '',
    ].join(' '));
  
  const buildSearchableText = (article: AuraKnowledgeArticle): string =>
    normalizeText([
      article.title,
      article.content,
      ...(article.tags || []),
      article.category || '',
      article.module || '',
      article.system || '',
    ].join(' '));
  
  const scoreArticle = (
    article: AuraKnowledgeArticle,
    question: string
  ): number => {
    const searchableText = buildSearchableText(article);
    const articleTokens = buildArticleTokens(article);
    const questionText = normalizeText(question);
    const questionTokens = tokenize(question);
  
    let score = 0;
  
    if (searchableText.includes(questionText)) {
      score += 20;
    }
  
    questionTokens.forEach((token) => {
      if (searchableText.includes(token)) {
        score += 3;
      }
  
      if (normalizeText(article.title).includes(token)) {
        score += 5;
      }
  
      if ((article.tags || []).some((tag) => normalizeText(tag).includes(token))) {
        score += 4;
      }
  
      if (normalizeText(article.module).includes(token)) {
        score += 2;
      }
  
      if (normalizeText(article.category).includes(token)) {
        score += 2;
      }
  
      const fuzzyMatch = articleTokens.some((articleToken) =>
        areTokensSimilar(token, articleToken)
      );
  
      if (fuzzyMatch) {
        score += 2;
      }
    });
  
    return score;
  };
  
  export const getPublishedKnowledgeArticles = async (
    system?: AuraSystem,
    language?: string
  ): Promise<AuraKnowledgeArticle[]> => {
    try {
      let q = query(
        collection(db, KNOWLEDGE_COLLECTION),
        where('status', '==', 'published')
      );
  
      if (system && system !== 'unknown') {
        q = query(q, where('system', '==', system));
      }
  
      if (language) {
        q = query(q, where('language', '==', language));
      }

      // Limitar lecturas para ser Firebase-efficient
      q = query(q, limit(40));
  
      const snapshot = await getDocs(q);
  
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<AuraKnowledgeArticle, 'id'>),
      }));
    } catch (error) {
      console.error(
        '[Aura Intelligence] Error loading knowledge articles:',
        error
      );
  
      return [];
    }
  };
  
  export const searchKnowledgeArticles = async (
    question: string,
    system?: AuraSystem,
    moduleId?: string,
    language?: string
  ): Promise<AuraKnowledgeArticle[]> => {
    let articles = await getPublishedKnowledgeArticles(system, language);
  
    // Filtrar localmente por módulo si se especificó
    if (moduleId && moduleId !== 'unknown') {
      articles = articles.filter(
        (article) => article.module === moduleId
      );
    }

    return articles
      .map((article) => ({
        article,
        score: scoreArticle(article, question),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.article);
  };

  const knowledgeService = {
    getPublishedKnowledgeArticles,
    searchKnowledgeArticles,
  };

  export default knowledgeService;