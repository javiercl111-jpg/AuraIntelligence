import type { AuraSystemId } from './auraModules';
import type { AuraIntentId } from './auraIntent';

export type AuraActionType =
  | 'navigation'
  | 'create'
  | 'view'
  | 'support'
  | 'external';

export interface AuraActionDefinition {
  id: string;
  label: string;
  description: string;
  type: AuraActionType;
  system: AuraSystemId;
  moduleId: string;
  route?: string;
  intentIds: AuraIntentId[];
  requiresConfirmation: boolean;
  enabled: boolean;
}

export interface AuraSuggestedAction {
  id: string;
  label: string;
  description: string;
  type: AuraActionType;
  system: AuraSystemId;
  moduleId: string;
  route?: string;
  confidence: number;
  requiresConfirmation: boolean;
}

export const AURA_ACTIONS: AuraActionDefinition[] = [
  {
    id: 'open_hcm_employees',
    label: 'Abrir Gestión de Empleados',
    description: 'Ir al módulo de empleados en Aura HCM.',
    type: 'navigation',
    system: 'aura_hcm',
    moduleId: 'employees',
    route: '/employees',
    intentIds: ['CREATE_EMPLOYEE', 'EDIT_EMPLOYEE'],
    requiresConfirmation: false,
    enabled: true,
  },
  {
    id: 'open_hcm_payroll',
    label: 'Abrir Nómina',
    description: 'Ir al módulo de nómina en Aura HCM.',
    type: 'navigation',
    system: 'aura_hcm',
    moduleId: 'payroll',
    route: '/payroll',
    intentIds: ['GENERATE_PAYROLL', 'VIEW_RECEIPTS'],
    requiresConfirmation: false,
    enabled: true,
  },
  {
    id: 'open_hcm_vacations',
    label: 'Abrir Vacaciones',
    description: 'Ir al módulo de vacaciones en Aura HCM.',
    type: 'navigation',
    system: 'aura_hcm',
    moduleId: 'vacations',
    route: '/vacations',
    intentIds: ['REQUEST_VACATION', 'APPROVE_VACATION'],
    requiresConfirmation: false,
    enabled: true,
  },
  {
    id: 'open_hcm_permissions',
    label: 'Abrir Permisos',
    description: 'Ir al módulo de permisos en Aura HCM.',
    type: 'navigation',
    system: 'aura_hcm',
    moduleId: 'permissions',
    route: '/absences',
    intentIds: ['REQUEST_PERMISSION'],
    requiresConfirmation: false,
    enabled: true,
  },
  {
    id: 'open_hcm_incapacities',
    label: 'Abrir Incapacidades',
    description: 'Ir al módulo de incapacidades en Aura HCM.',
    type: 'navigation',
    system: 'aura_hcm',
    moduleId: 'incapacities',
    route: '/incapacities',
    intentIds: ['REGISTER_INCAPACITY'],
    requiresConfirmation: false,
    enabled: true,
  },
  {
    id: 'open_hcm_signatures',
    label: 'Abrir Mis Firmas',
    description: 'Ir al módulo de firma electrónica.',
    type: 'navigation',
    system: 'aura_hcm',
    moduleId: 'signatures',
    route: '/my-signatures',
    intentIds: ['SIGN_DOCUMENT'],
    requiresConfirmation: false,
    enabled: true,
  },
  {
    id: 'open_hcm_admin_acts',
    label: 'Abrir Actas Administrativas',
    description: 'Ir al módulo de actas administrativas.',
    type: 'navigation',
    system: 'aura_hcm',
    moduleId: 'adminActs',
    route: '/admin-acts',
    intentIds: ['RESPOND_ADMIN_ACT'],
    requiresConfirmation: false,
    enabled: true,
  },
  {
    id: 'open_maintenance_work_orders',
    label: 'Abrir Órdenes de Trabajo',
    description: 'Ir al módulo de órdenes de trabajo en Aura Maintenance OS.',
    type: 'navigation',
    system: 'aura_maintenance',
    moduleId: 'work_orders',
    route: '/work-orders',
    intentIds: ['CREATE_WORK_ORDER', 'CLOSE_WORK_ORDER', 'WORK_OFFLINE'],
    requiresConfirmation: false,
    enabled: true,
  },
  {
    id: 'open_maintenance_inventory',
    label: 'Abrir Inventario',
    description: 'Ir al módulo de inventario en Aura Maintenance OS.',
    type: 'navigation',
    system: 'aura_maintenance',
    moduleId: 'inventory',
    route: '/inventory',
    intentIds: ['CHECK_INVENTORY'],
    requiresConfirmation: false,
    enabled: true,
  },
  {
    id: 'open_maintenance_preventive',
    label: 'Abrir Preventivos',
    description: 'Ir al módulo de mantenimiento preventivo.',
    type: 'navigation',
    system: 'aura_maintenance',
    moduleId: 'preventive',
    route: '/preventive',
    intentIds: ['CREATE_PREVENTIVE'],
    requiresConfirmation: false,
    enabled: true,
  },
  {
    id: 'open_signature_documents',
    label: 'Abrir Aura Signature',
    description: 'Ir al centro de documentos y firmas.',
    type: 'navigation',
    system: 'aura_signature',
    moduleId: 'documents',
    route: '/signatures',
    intentIds: ['VERIFY_SIGNATURE'],
    requiresConfirmation: false,
    enabled: true,
  },
  {
    id: 'open_signature_templates',
    label: 'Abrir Plantillas',
    description: 'Ir al módulo de plantillas documentales.',
    type: 'navigation',
    system: 'aura_signature',
    moduleId: 'templates',
    route: '/signatures/templates',
    intentIds: ['MANAGE_TEMPLATE'],
    requiresConfirmation: false,
    enabled: true,
  },
];