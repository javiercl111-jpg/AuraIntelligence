import type { AuraSystemId } from './auraModules';

export type AuraIntentId =
  | 'CREATE_EMPLOYEE'
  | 'EDIT_EMPLOYEE'
  | 'GENERATE_PAYROLL'
  | 'VIEW_RECEIPTS'
  | 'REQUEST_VACATION'
  | 'APPROVE_VACATION'
  | 'REGISTER_INCAPACITY'
  | 'REQUEST_PERMISSION'
  | 'SIGN_DOCUMENT'
  | 'RESPOND_ADMIN_ACT'
  | 'CREATE_WORK_ORDER'
  | 'CLOSE_WORK_ORDER'
  | 'WORK_OFFLINE'
  | 'CREATE_PREVENTIVE'
  | 'CHECK_INVENTORY'
  | 'VERIFY_SIGNATURE'
  | 'MANAGE_TEMPLATE'
  | 'UNKNOWN';

export interface AuraIntentDefinition {
  id: AuraIntentId;
  name: string;
  description: string;
  system: AuraSystemId;
  moduleId: string;
  categoryId: string;
  keywords: string[];
}

export interface AuraIntentDetectionResult {
  intentId: AuraIntentId;
  system: AuraSystemId | 'unknown';
  moduleId?: string;
  categoryId?: string;
  confidence: number;
  matchedKeywords: string[];
}

export const AURA_INTENTS: AuraIntentDefinition[] = [
  {
    id: 'CREATE_EMPLOYEE',
    name: 'Crear empleado',
    description: 'Alta de empleado o colaborador',
    system: 'aura_hcm',
    moduleId: 'employees',
    categoryId: 'employee_management',
    keywords: ['crear empleado', 'alta empleado', 'nuevo empleado', 'colaborador nuevo'],
  },
  {
    id: 'EDIT_EMPLOYEE',
    name: 'Editar empleado',
    description: 'Actualizar datos de empleado',
    system: 'aura_hcm',
    moduleId: 'employees',
    categoryId: 'employee_management',
    keywords: ['editar empleado', 'modificar empleado', 'cambiar datos', 'actualizar colaborador'],
  },
  {
    id: 'GENERATE_PAYROLL',
    name: 'Generar nómina',
    description: 'Crear o procesar corrida de nómina',
    system: 'aura_hcm',
    moduleId: 'payroll',
    categoryId: 'payroll',
    keywords: ['generar nomina', 'crear nomina', 'procesar nomina', 'corrida nomina', 'hacer nomina'],
  },
  {
    id: 'VIEW_RECEIPTS',
    name: 'Consultar recibos',
    description: 'Consultar recibos de nómina',
    system: 'aura_hcm',
    moduleId: 'payroll',
    categoryId: 'payroll',
    keywords: ['ver recibos', 'consultar recibos', 'mis recibos', 'recibos nomina', 'descargar recibo'],
  },
  {
    id: 'REQUEST_VACATION',
    name: 'Solicitar vacaciones',
    description: 'Solicitud de vacaciones',
    system: 'aura_hcm',
    moduleId: 'vacations',
    categoryId: 'vacations',
    keywords: ['solicitar vacaciones', 'pedir vacaciones', 'vacaciones', 'dias descanso'],
  },
  {
    id: 'APPROVE_VACATION',
    name: 'Aprobar vacaciones',
    description: 'Aprobación de solicitudes de vacaciones',
    system: 'aura_hcm',
    moduleId: 'vacations',
    categoryId: 'vacations',
    keywords: ['aprobar vacaciones', 'autorizar vacaciones', 'validar vacaciones'],
  },
  {
    id: 'REGISTER_INCAPACITY',
    name: 'Registrar incapacidad',
    description: 'Registro de incapacidades',
    system: 'aura_hcm',
    moduleId: 'incapacities',
    categoryId: 'incapacities',
    keywords: ['registrar incapacidad', 'subir incapacidad', 'incapacidad', 'incapacidades'],
  },
  {
    id: 'REQUEST_PERMISSION',
    name: 'Solicitar permiso',
    description: 'Solicitud de permisos',
    system: 'aura_hcm',
    moduleId: 'permissions',
    categoryId: 'permissions',
    keywords: ['solicitar permiso', 'pedir permiso', 'permiso', 'ausencia'],
  },
  {
    id: 'SIGN_DOCUMENT',
    name: 'Firmar documento',
    description: 'Firma electrónica de documentos',
    system: 'aura_hcm',
    moduleId: 'signatures',
    categoryId: 'electronic_signature',
    keywords: ['firmar documento', 'mis firmas', 'firma electronica', 'documento pendiente'],
  },
  {
    id: 'RESPOND_ADMIN_ACT',
    name: 'Responder acta administrativa',
    description: 'Defensa o respuesta de acta administrativa',
    system: 'aura_hcm',
    moduleId: 'adminActs',
    categoryId: 'admin_acts',
    keywords: ['responder acta', 'acta administrativa', 'defensa acta', 'mis actas'],
  },
  {
    id: 'CREATE_WORK_ORDER',
    name: 'Crear orden de trabajo',
    description: 'Alta de orden de mantenimiento',
    system: 'aura_maintenance',
    moduleId: 'work_orders',
    categoryId: 'work_orders',
    keywords: ['crear orden', 'nueva orden', 'orden de trabajo', 'work order'],
  },
  {
    id: 'CLOSE_WORK_ORDER',
    name: 'Cerrar orden de trabajo',
    description: 'Cierre de orden de mantenimiento',
    system: 'aura_maintenance',
    moduleId: 'work_orders',
    categoryId: 'work_orders',
    keywords: ['cerrar orden', 'completar orden', 'terminar orden', 'finalizar orden'],
  },
  {
    id: 'WORK_OFFLINE',
    name: 'Trabajar offline',
    description: 'Operación sin conexión',
    system: 'aura_maintenance',
    moduleId: 'work_orders',
    categoryId: 'offline',
    keywords: ['offline', 'sin conexion', 'sin internet', 'orden offline', 'modo offline'],
  },
  {
    id: 'CREATE_PREVENTIVE',
    name: 'Crear preventivo',
    description: 'Creación de mantenimiento preventivo',
    system: 'aura_maintenance',
    moduleId: 'preventive',
    categoryId: 'preventive',
    keywords: ['crear preventivo', 'mantenimiento preventivo', 'plan preventivo', 'preventivo'],
  },
  {
    id: 'CHECK_INVENTORY',
    name: 'Consultar inventario',
    description: 'Consulta de piezas, refacciones y stock',
    system: 'aura_maintenance',
    moduleId: 'inventory',
    categoryId: 'inventory',
    keywords: ['inventario', 'stock', 'refacciones', 'piezas', 'materiales'],
  },
  {
    id: 'VERIFY_SIGNATURE',
    name: 'Verificar firma',
    description: 'Verificación de firma electrónica',
    system: 'aura_signature',
    moduleId: 'documents',
    categoryId: 'signature_audit',
    keywords: ['verificar firma', 'validar firma', 'codigo verificacion', 'firma valida'],
  },
  {
    id: 'MANAGE_TEMPLATE',
    name: 'Administrar plantilla',
    description: 'Gestión de plantillas documentales',
    system: 'aura_signature',
    moduleId: 'templates',
    categoryId: 'templates',
    keywords: ['plantilla', 'machote', 'formato', 'template'],
  },
];