import type {
    AuraOperationalIntentResult,
  } from '../types/auraOperationalIntent';
  
  const normalizeText = (value: unknown): string =>
    String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  
  const includesAny = (
    text: string,
    keywords: string[]
  ): string[] => {
    return keywords.filter((keyword) =>
      text.includes(normalizeText(keyword))
    );
  };
  
  export const detectAuraOperationalIntent = (
    question: string
  ): AuraOperationalIntentResult => {
    const text = normalizeText(question);
  
    const rules: AuraOperationalIntentResult[] = [
      {
        intentId: 'COUNT_WORK_ORDERS',
        source: 'maintenance',
        confidence: 0.95,
        matchedKeywords: includesAny(text, [
          'cuantas ordenes abiertas',
          'cuantas ordenes pendientes',
          'ordenes abiertas',
          'ordenes pendientes',
          'ordenes activas',
        ]),
      },
      {
        intentId: 'COUNT_URGENT_WORK_ORDERS',
        source: 'maintenance',
        confidence: 0.95,
        matchedKeywords: includesAny(text, [
          'cuantas ordenes urgentes',
          'ordenes urgentes',
          'urgentes',
        ]),
      },
      {
        intentId: 'COUNT_OVERDUE_WORK_ORDERS',
        source: 'maintenance',
        confidence: 0.95,
        matchedKeywords: includesAny(text, [
          'ordenes vencidas',
          'ordenes atrasadas',
          'vencidas',
          'atrasadas',
        ]),
      },
      {
        intentId: 'COUNT_UNASSIGNED_WORK_ORDERS',
        source: 'maintenance',
        confidence: 0.95,
        matchedKeywords: includesAny(text, [
          'ordenes sin asignar',
          'no asignadas',
          'sin asignar',
        ]),
      },
      {
        intentId: 'COUNT_PENDING_SIGNATURES',
        source: 'signature',
        confidence: 0.95,
        matchedKeywords: includesAny(text, [
          'documentos pendientes de firma',
          'pendientes de firma',
          'documentos pendientes',
          'cuantos documentos pendientes',
        ]),
      },
      {
        intentId: 'COUNT_SIGNED_TODAY',
        source: 'signature',
        confidence: 0.95,
        matchedKeywords: includesAny(text, [
          'documentos firmados hoy',
          'firmados hoy',
          'cuantos documentos se firmaron hoy',
          'cuantos se firmaron hoy',
        ]),
      },
      {
        intentId: 'COUNT_SEALED_DOCUMENTS',
        source: 'signature',
        confidence: 0.95,
        matchedKeywords: includesAny(text, [
          'documentos sellados',
          'sobres sellados',
          'sellados',
        ]),
      },
      {
        intentId: 'COUNT_LOW_STOCK_ITEMS',
        source: 'maintenance',
        confidence: 0.95,
        matchedKeywords: includesAny(text, [
          'stock bajo',
          'bajo inventario',
          'articulos con stock bajo',
          'piezas con stock bajo',
        ]),
      },
      {
        intentId: 'COUNT_OUT_OF_STOCK_ITEMS',
        source: 'maintenance',
        confidence: 0.95,
        matchedKeywords: includesAny(text, [
          'sin stock',
          'agotados',
          'articulos sin stock',
          'piezas sin stock',
        ]),
      },
      {
        intentId: 'COUNT_PREVENTIVES_OVERDUE',
        source: 'maintenance',
        confidence: 0.95,
        matchedKeywords: includesAny(text, [
          'preventivos vencidos',
          'planes vencidos',
          'mantenimientos vencidos',
        ]),
      },
      {
        intentId: 'COUNT_ACTIVE_EMERGENCIES',
        source: 'maintenance',
        confidence: 0.95,
        matchedKeywords: includesAny(text, [
          'emergencias activas',
          'emergencia activa',
          'cuantas emergencias',
        ]),
      },
      {
        intentId: 'COUNT_ACTIVE_EMPLOYEES',
        source: 'hcm',
        confidence: 0.9,
        matchedKeywords: includesAny(text, [
          'empleados activos',
          'cuantos empleados activos',
          'colaboradores activos',
        ]),
      },
    ];
  
    const match = rules.find((rule) => rule.matchedKeywords.length > 0);
  
    if (match) return match;
  
    return {
      intentId: 'UNKNOWN_OPERATIONAL',
      source: 'unknown',
      confidence: 0,
      matchedKeywords: [],
    };
  };