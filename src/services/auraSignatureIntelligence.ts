import type {
    AuraSignatureConnectorContext,
  } from '../types/auraSignatureConnector';
  
  const normalizeText = (value: unknown): string =>
    String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  
  export const answerAuraSignatureQuestion = ({
    question,
    context,
  }: {
    question: string;
    context: AuraSignatureConnectorContext;
  }): string | null => {
    const normalizedQuestion = normalizeText(question);
  
    if (
      normalizedQuestion.includes('pendientes de firma') ||
      normalizedQuestion.includes('documentos pendientes')
    ) {
      return `Actualmente hay ${context.documents.pendingSignature} documentos pendientes de firma.`;
    }
  
    if (
      normalizedQuestion.includes('firmados hoy') ||
      normalizedQuestion.includes('documentos firmados hoy')
    ) {
      return `Hoy se han firmado ${context.documents.signedToday} documentos.`;
    }
  
    if (
      normalizedQuestion.includes('documentos sellados') ||
      normalizedQuestion.includes('sellados')
    ) {
      return `Actualmente existen ${context.documents.sealedDocuments} documentos sellados.`;
    }
  
    if (
      normalizedQuestion.includes('documentos rechazados') ||
      normalizedQuestion.includes('rechazados')
    ) {
      return `Actualmente existen ${context.documents.rejectedDocuments} documentos rechazados.`;
    }
  
    if (
      normalizedQuestion.includes('documentos expirados') ||
      normalizedQuestion.includes('expirados')
    ) {
      return `Actualmente existen ${context.documents.expiredDocuments} documentos expirados.`;
    }
  
    if (
      normalizedQuestion.includes('plantillas activas') ||
      normalizedQuestion.includes('templates activos')
    ) {
      return `Actualmente existen ${context.templates.activeTemplates} plantillas activas.`;
    }
  
    if (
      normalizedQuestion.includes('borradores') ||
      normalizedQuestion.includes('plantillas borrador')
    ) {
      return `Actualmente existen ${context.templates.draftTemplates} plantillas en borrador.`;
    }
  
    if (
      normalizedQuestion.includes('sobres pendientes') ||
      normalizedQuestion.includes('envelopes pendientes')
    ) {
      return `Actualmente existen ${context.envelopes.pendingEnvelopes} sobres pendientes de firma.`;
    }
  
    if (
      normalizedQuestion.includes('sobres completados') ||
      normalizedQuestion.includes('envelopes completados')
    ) {
      return `Actualmente existen ${context.envelopes.completedEnvelopes} sobres completados.`;
    }
  
    if (
      normalizedQuestion.includes('sobres sellados') ||
      normalizedQuestion.includes('envelopes sellados')
    ) {
      return `Actualmente existen ${context.envelopes.sealedEnvelopes} sobres sellados.`;
    }
  
    return null;
  };