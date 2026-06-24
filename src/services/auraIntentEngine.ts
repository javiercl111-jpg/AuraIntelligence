import {
    AURA_INTENTS,
    type AuraIntentDefinition,
    type AuraIntentDetectionResult,
  } from '../types/auraIntent';
  
  const normalizeText = (value: unknown): string =>
    String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  
  const COMMON_TYPOS: Record<string, string> = {
    nomna: 'nomina',
    nomiina: 'nomina',
    resivo: 'recibo',
    resivos: 'recibos',
    recivo: 'recibo',
    recivos: 'recibos',
    vacasiones: 'vacaciones',
    vacacion: 'vacaciones',
    incapasidad: 'incapacidad',
    incapasidades: 'incapacidades',
    ofline: 'offline',
    coneccion: 'conexion',
    conecion: 'conexion',
  };
  
  const normalizeKnownTypos = (text: string): string => {
    return normalizeText(text)
      .split(' ')
      .map((word) => COMMON_TYPOS[word] || word)
      .join(' ');
  };
  
  const scoreIntent = (
    intent: AuraIntentDefinition,
    question: string
  ): {
    score: number;
    matchedKeywords: string[];
  } => {
    const normalizedQuestion = normalizeKnownTypos(question);
    let score = 0;
    const matchedKeywords: string[] = [];
  
    intent.keywords.forEach((keyword) => {
      const normalizedKeyword = normalizeKnownTypos(keyword);
  
      if (normalizedQuestion.includes(normalizedKeyword)) {
        score += 10;
        matchedKeywords.push(keyword);
        return;
      }
  
      const keywordTokens = normalizedKeyword.split(' ').filter(Boolean);
      const matchedTokenCount = keywordTokens.filter((token) =>
        normalizedQuestion.includes(token)
      ).length;
  
      if (matchedTokenCount > 0) {
        score += matchedTokenCount * 3;
        matchedKeywords.push(keyword);
      }
    });
  
    return {
      score,
      matchedKeywords: Array.from(new Set(matchedKeywords)),
    };
  };
  
  export const detectAuraIntent = (
    question: string
  ): AuraIntentDetectionResult => {
    const scoredIntents = AURA_INTENTS
      .map((intent) => {
        const result = scoreIntent(intent, question);
  
        return {
          intent,
          score: result.score,
          matchedKeywords: result.matchedKeywords,
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
  
    const bestMatch = scoredIntents[0];
  
    if (!bestMatch) {
      return {
        intentId: 'UNKNOWN',
        system: 'unknown',
        confidence: 0,
        matchedKeywords: [],
      };
    }
  
    const confidence = Math.min(0.99, bestMatch.score / 20);
  
    return {
      intentId: bestMatch.intent.id,
      system: bestMatch.intent.system,
      moduleId: bestMatch.intent.moduleId,
      categoryId: bestMatch.intent.categoryId,
      confidence,
      matchedKeywords: bestMatch.matchedKeywords,
    };
  };