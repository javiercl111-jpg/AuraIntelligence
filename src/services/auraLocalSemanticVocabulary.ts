export type AuraCanonicalBusinessConcept =
  | 'WORKFORCE_ATTENDANCE'
  | 'WORKFORCE_ADMINISTRATION'
  | 'ASSET_MAINTENANCE'
  | 'WORK_ORDER_MANAGEMENT'
  | 'DOCUMENT_GOVERNANCE'
  | 'COMMERCIAL_GROWTH'
  | 'BUSINESS_INTELLIGENCE'
  | 'MID_MARKET_COMPANY';

export interface AuraLocalSemanticConceptDefinition {
  readonly concept:
    AuraCanonicalBusinessConcept;

  readonly aliases:
    readonly string[];
}

/**
 * Business-language vocabulary only.
 *
 * IMPORTANT:
 * - Concepts represent business needs.
 * - Concepts MUST NOT identify or recommend Aura products.
 * - Commercial product selection remains owned by Growth.
 */
export const AURA_LOCAL_SEMANTIC_VOCABULARY:
readonly AuraLocalSemanticConceptDefinition[] = [
  {
    concept:
      'WORKFORCE_ATTENDANCE',

    aliases: [
      'asistencia',
      'control de asistencia',
      'reloj checador',
      'checador',
      'entradas y salidas',
      'entrada y salida',
      'retardos',
      'faltas',
      'horarios de empleados',
      'control de horario',
      'registro de entrada',
      'registro de salida',
      'puntualidad',
      'attendance',
      'attendance management',
      'time attendance',
      'employee attendance',
      'clock in',
      'clock out',
    ],
  },

  {
    concept:
      'WORKFORCE_ADMINISTRATION',

    aliases: [
      'recursos humanos',
      'rh',
      'gestion de personal',
      'administracion de personal',
      'empleados',
      'expediente de empleados',
      'incidencias de personal',
      'vacaciones',
      'permisos',
      'incapacidades',
      'human resources',
      'workforce management',
      'employee management',
      'personnel administration',
      'employee administration',
    ],
  },

  {
    concept:
      'ASSET_MAINTENANCE',

    aliases: [
      'mantenimiento',
      'mantenimiento preventivo',
      'mantenimiento correctivo',
      'maquina parada',
      'maquinas paradas',
      'equipo detenido',
      'equipos detenidos',
      'fallas de equipo',
      'fallas recurrentes',
      'activos en mantenimiento',
      'disponibilidad de equipos',
      'mantenimiento de activos',
      'asset maintenance',
      'preventive maintenance',
      'corrective maintenance',
      'equipment maintenance',
      'equipment failure',
      'asset availability',
    ],
  },

  {
    concept:
      'WORK_ORDER_MANAGEMENT',

    aliases: [
      'orden de trabajo',
      'ordenes de trabajo',
      'orden de mantenimiento',
      'ordenes de mantenimiento',
      'trabajos pendientes',
      'mantenimiento pendiente',
      'seguimiento de ordenes',
      'asignacion de tecnicos',
      'work order',
      'work orders',
      'maintenance order',
      'maintenance orders',
      'technician assignment',
      'pending maintenance work',
    ],
  },

  {
    concept:
      'DOCUMENT_GOVERNANCE',

    aliases: [
      'firma de documentos',
      'firma electronica',
      'firma digital',
      'documentos firmados',
      'aprobacion de documentos',
      'autorizacion de documentos',
      'trazabilidad documental',
      'control documental',
      'evidencia documental',
      'electronic signature',
      'digital signature',
      'document signature',
      'document approval',
      'document governance',
      'document traceability',
    ],
  },

  {
    concept:
      'COMMERCIAL_GROWTH',

    aliases: [
      'crecimiento comercial',
      'ventas',
      'prospeccion',
      'prospectos',
      'generacion de leads',
      'clientes potenciales',
      'campanas comerciales',
      'estrategia comercial',
      'seguimiento comercial',
      'conversion de prospectos',
      'commercial growth',
      'sales growth',
      'sales prospecting',
      'lead generation',
      'sales strategy',
      'commercial strategy',
      'prospect conversion',
    ],
  },

  {
    concept:
      'MID_MARKET_COMPANY',

    aliases: [
      'empresa mediana',
      'empresas medianas',
      'mediana empresa',
      'mercado medio',
      'mid market',
      'mid-market',
      'mid market company',
      'mid-market company',
      'mid market companies',
      'mid-market companies',
    ],
  },
  {
    concept:
      'BUSINESS_INTELLIGENCE',

    aliases: [
      'inteligencia de negocio',
      'inteligencia empresarial',
      'analitica',
      'analisis de datos',
      'indicadores',
      'kpis',
      'tableros ejecutivos',
      'toma de decisiones',
      'prediccion',
      'informacion ejecutiva',
      'business intelligence',
      'business analytics',
      'data analytics',
      'executive dashboards',
      'decision support',
      'predictive analytics',
    ],
  },
];

const normalizeText = (
  value: string,
): string =>
  value
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9\s]/g,
      ' ',
    )
    .replace(
      /\s+/g,
      ' ',
    )
    .trim();

export interface AuraLocalSemanticConceptMatch {
  readonly concept:
    AuraCanonicalBusinessConcept;

  readonly matchedAliases:
    readonly string[];
}

export class AuraLocalSemanticVocabulary {
  static normalize(
    value: string,
  ): string {
    return normalizeText(value);
  }

  static detect(
    value: string,
  ): AuraLocalSemanticConceptMatch[] {
    const normalized =
      normalizeText(value);

    if (!normalized) {
      return [];
    }

    const matches:
      AuraLocalSemanticConceptMatch[] = [];

    for (
      const definition of
      AURA_LOCAL_SEMANTIC_VOCABULARY
    ) {
      const matchedAliases =
        definition.aliases.filter(
          alias =>
            normalized.includes(
              normalizeText(alias),
            ),
        );

      if (
        matchedAliases.length > 0
      ) {
        matches.push({
          concept:
            definition.concept,

          matchedAliases:
            [...matchedAliases],
        });
      }
    }

    return matches;
  }
}
