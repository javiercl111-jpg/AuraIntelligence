import type {
    AuraAICompletionRequest,
    AuraAICompletionResponse,
  } from '../types/auraOpenAI';
  
  const buildMockAnswer = (
    request: AuraAICompletionRequest
  ): string => {
    const primaryArticle = request.articles[0];
  
    if (!primaryArticle) {
      return 'No encontré información suficiente en la base de conocimiento de Aura para responder con seguridad.';
    }
  
    return [
      `Con base en la documentación de Aura, esto es lo recomendado:`,
      '',
      primaryArticle.content,
    ].join('\n');
  };
  
  export const generateAuraAIAnswer = async (
    request: AuraAICompletionRequest
  ): Promise<AuraAICompletionResponse> => {
    const answer = buildMockAnswer(request);
  
    return {
      answer,
      provider: 'local_mock',
      model: 'aura-local-mock-v1',
      usedArticleIds: request.articles.map((article) => article.id),
      safetyNotes: [
        'Respuesta generada únicamente con base en artículos de conocimiento disponibles.',
      ],
    };
  };