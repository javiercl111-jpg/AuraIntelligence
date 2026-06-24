export type AuraSystemId =
  | 'aura_hcm'
  | 'aura_maintenance'
  | 'aura_signature'
  | 'aura_control_center'
  | 'aura_intelligence';

export interface AuraModuleDefinition {
  id: string;
  name: string;
  description: string;
  system: AuraSystemId;
}

export const AURA_HCM_MODULES: AuraModuleDefinition[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Panel principal',
    system: 'aura_hcm',
  },
  {
    id: 'employees',
    name: 'Gestión de Empleados',
    description: 'Administración de colaboradores',
    system: 'aura_hcm',
  },
  {
    id: 'payroll',
    name: 'Nómina',
    description: 'Procesamiento de nómina',
    system: 'aura_hcm',
  },
  {
    id: 'attendance',
    name: 'Asistencia',
    description: 'Control de asistencia',
    system: 'aura_hcm',
  },
  {
    id: 'vacations',
    name: 'Vacaciones',
    description: 'Gestión de vacaciones',
    system: 'aura_hcm',
  },
  {
    id: 'permissions',
    name: 'Permisos',
    description: 'Gestión de permisos',
    system: 'aura_hcm',
  },
  {
    id: 'incapacities',
    name: 'Incapacidades',
    description: 'Gestión de incapacidades',
    system: 'aura_hcm',
  },
  {
    id: 'tasks',
    name: 'Tareas',
    description: 'Asignación y seguimiento',
    system: 'aura_hcm',
  },
  {
    id: 'adminActs',
    name: 'Actas Administrativas',
    description: 'Gestión disciplinaria',
    system: 'aura_hcm',
  },
  {
    id: 'signatures',
    name: 'Aura Signature',
    description: 'Firma electrónica',
    system: 'aura_hcm',
  },
  {
    id: 'notifications',
    name: 'Notificaciones',
    description: 'Centro de notificaciones',
    system: 'aura_hcm',
  },
  {
    id: 'reports',
    name: 'Reportes',
    description: 'Reportes ejecutivos',
    system: 'aura_hcm',
  },
];

export const AURA_MAINTENANCE_MODULES: AuraModuleDefinition[] = [
  {
    id: 'work_orders',
    name: 'Work Orders',
    description: 'Órdenes de trabajo',
    system: 'aura_maintenance',
  },
  {
    id: 'preventive',
    name: 'Preventive Maintenance',
    description: 'Mantenimiento preventivo',
    system: 'aura_maintenance',
  },
  {
    id: 'assets',
    name: 'Assets',
    description: 'Gestión de activos',
    system: 'aura_maintenance',
  },
  {
    id: 'inventory',
    name: 'Inventory',
    description: 'Inventario',
    system: 'aura_maintenance',
  },
  {
    id: 'locations',
    name: 'Locations',
    description: 'Ubicaciones operativas',
    system: 'aura_maintenance',
  },
  {
    id: 'emergency',
    name: 'Emergency Management',
    description: 'Gestión de emergencias',
    system: 'aura_maintenance',
  },
  {
    id: 'qr_center',
    name: 'QR Center',
    description: 'Centro QR',
    system: 'aura_maintenance',
  },
  {
    id: 'reports',
    name: 'Reports',
    description: 'Reportes operativos',
    system: 'aura_maintenance',
  },
];

export const AURA_SIGNATURE_MODULES: AuraModuleDefinition[] = [
  {
    id: 'documents',
    name: 'Documentos',
    description: 'Gestión documental',
    system: 'aura_signature',
  },
  {
    id: 'templates',
    name: 'Plantillas',
    description: 'Machotes y formatos',
    system: 'aura_signature',
  },
  {
    id: 'audit',
    name: 'Auditoría',
    description: 'Auditoría de firmas',
    system: 'aura_signature',
  },
];

export const AURA_INTELLIGENCE_MODULES: AuraModuleDefinition[] = [
  {
    id: 'knowledge_center',
    name: 'Knowledge Center',
    description: 'Base de conocimiento',
    system: 'aura_intelligence',
  },
  {
    id: 'audit_center',
    name: 'Audit Center',
    description: 'Auditoría IA',
    system: 'aura_intelligence',
  },
];

export const ALL_AURA_MODULES: AuraModuleDefinition[] = [
  ...AURA_HCM_MODULES,
  ...AURA_MAINTENANCE_MODULES,
  ...AURA_SIGNATURE_MODULES,
  ...AURA_INTELLIGENCE_MODULES,
];