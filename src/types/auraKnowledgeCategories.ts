import type { AuraSystemId } from './auraModules';

export interface AuraKnowledgeCategoryDefinition {
  id: string;
  name: string;
  description: string;
  system: AuraSystemId;
  moduleIds?: string[];
}

export const AURA_HCM_KNOWLEDGE_CATEGORIES: AuraKnowledgeCategoryDefinition[] = [
  {
    id: 'employee_management',
    name: 'Gestión de Empleados',
    description: 'Altas, edición, perfiles, roles e identidad laboral',
    system: 'aura_hcm',
    moduleIds: ['employees'],
  },
  {
    id: 'payroll',
    name: 'Nómina',
    description: 'Corridas, recibos, incidencias y reglas de nómina',
    system: 'aura_hcm',
    moduleIds: ['payroll'],
  },
  {
    id: 'attendance',
    name: 'Asistencia',
    description: 'Checadas, horarios, retardos y registros de asistencia',
    system: 'aura_hcm',
    moduleIds: ['attendance'],
  },
  {
    id: 'vacations',
    name: 'Vacaciones',
    description: 'Solicitudes, aprobación y saldos de vacaciones',
    system: 'aura_hcm',
    moduleIds: ['vacations'],
  },
  {
    id: 'permissions',
    name: 'Permisos',
    description: 'Solicitudes de permisos y ausencias autorizadas',
    system: 'aura_hcm',
    moduleIds: ['permissions'],
  },
  {
    id: 'incapacities',
    name: 'Incapacidades',
    description: 'Registro y seguimiento de incapacidades',
    system: 'aura_hcm',
    moduleIds: ['incapacities'],
  },
  {
    id: 'admin_acts',
    name: 'Actas Administrativas',
    description: 'Defensas, dictámenes, evidencias y seguimiento disciplinario',
    system: 'aura_hcm',
    moduleIds: ['adminActs'],
  },
  {
    id: 'electronic_signature',
    name: 'Firma Electrónica',
    description: 'Documentos, firmas y validación con Aura Signature',
    system: 'aura_hcm',
    moduleIds: ['signatures'],
  },
  {
    id: 'notifications',
    name: 'Notificaciones',
    description: 'Campana, push, avisos y navegación a entidades',
    system: 'aura_hcm',
    moduleIds: ['notifications'],
  },
  {
    id: 'reports',
    name: 'Reportes',
    description: 'Reportes ejecutivos, KPIs y exportaciones',
    system: 'aura_hcm',
    moduleIds: ['reports'],
  },
];

export const AURA_MAINTENANCE_KNOWLEDGE_CATEGORIES: AuraKnowledgeCategoryDefinition[] = [
  {
    id: 'work_orders',
    name: 'Órdenes de Trabajo',
    description: 'Creación, asignación, seguimiento y cierre de órdenes',
    system: 'aura_maintenance',
    moduleIds: ['work_orders'],
  },
  {
    id: 'offline',
    name: 'Operación Offline',
    description: 'Sincronización, evidencias y operación sin conexión',
    system: 'aura_maintenance',
    moduleIds: ['work_orders'],
  },
  {
    id: 'assets',
    name: 'Activos',
    description: 'Gestión, historial y mantenimiento de activos',
    system: 'aura_maintenance',
    moduleIds: ['assets'],
  },
  {
    id: 'inventory',
    name: 'Inventario',
    description: 'Refacciones, stock, consumos y disponibilidad',
    system: 'aura_maintenance',
    moduleIds: ['inventory'],
  },
  {
    id: 'locations',
    name: 'Ubicaciones',
    description: 'Ubicaciones operativas, zonas, pisos y áreas',
    system: 'aura_maintenance',
    moduleIds: ['locations'],
  },
  {
    id: 'preventive',
    name: 'Mantenimiento Preventivo',
    description: 'Planes, checklists, frecuencias y ejecución preventiva',
    system: 'aura_maintenance',
    moduleIds: ['preventive'],
  },
  {
    id: 'emergency',
    name: 'Emergencias',
    description: 'Protocolos, inspecciones y seguimiento de eventos críticos',
    system: 'aura_maintenance',
    moduleIds: ['emergency'],
  },
  {
    id: 'qr_ecosystem',
    name: 'QR Ecosystem',
    description: 'QR de activos, ubicaciones, impresión y escaneo',
    system: 'aura_maintenance',
    moduleIds: ['qr_center'],
  },
  {
    id: 'maintenance_reports',
    name: 'Reportes de Mantenimiento',
    description: 'KPIs, reportes operativos, MTTR, MTBF y análisis',
    system: 'aura_maintenance',
    moduleIds: ['reports'],
  },
];

export const AURA_SIGNATURE_KNOWLEDGE_CATEGORIES: AuraKnowledgeCategoryDefinition[] = [
  {
    id: 'documents',
    name: 'Documentos',
    description: 'Gestión y preparación documental',
    system: 'aura_signature',
    moduleIds: ['documents'],
  },
  {
    id: 'templates',
    name: 'Plantillas',
    description: 'Machotes, formatos y plantillas documentales',
    system: 'aura_signature',
    moduleIds: ['templates'],
  },
  {
    id: 'signatures',
    name: 'Firmas',
    description: 'Solicitud, firma, validación y custodia',
    system: 'aura_signature',
    moduleIds: ['documents'],
  },
  {
    id: 'signature_audit',
    name: 'Auditoría de Firma',
    description: 'Trazabilidad, eventos, sellado y verificación',
    system: 'aura_signature',
    moduleIds: ['audit'],
  },
];

export const AURA_INTELLIGENCE_KNOWLEDGE_CATEGORIES: AuraKnowledgeCategoryDefinition[] = [
  {
    id: 'knowledge_center',
    name: 'Knowledge Center',
    description: 'Administración de artículos y base documental',
    system: 'aura_intelligence',
    moduleIds: ['knowledge_center'],
  },
  {
    id: 'ai_audit',
    name: 'Auditoría IA',
    description: 'Historial de preguntas, respuestas y fuentes utilizadas',
    system: 'aura_intelligence',
    moduleIds: ['audit_center'],
  },
];

export const ALL_AURA_KNOWLEDGE_CATEGORIES: AuraKnowledgeCategoryDefinition[] = [
  ...AURA_HCM_KNOWLEDGE_CATEGORIES,
  ...AURA_MAINTENANCE_KNOWLEDGE_CATEGORIES,
  ...AURA_SIGNATURE_KNOWLEDGE_CATEGORIES,
  ...AURA_INTELLIGENCE_KNOWLEDGE_CATEGORIES,
];