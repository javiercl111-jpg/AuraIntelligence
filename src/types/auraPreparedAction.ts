export type AuraPreparedActionType =
  | 'vacation_request'
  | 'payroll_run'
  | 'work_order'
  | 'preventive_work_order'
  | 'signature_document'
  | 'employee_action'
  | 'incapacity_request'
  | 'permission_request'
  | 'sign_document'
  | 'create_employee'
  | 'generic';

export type AuraPreparedActionStatus =
  | 'draft'
  | 'ready_for_confirmation'
  | 'confirmed'
  | 'cancelled';

export interface AuraPreparedActionField {
  key: string;
  label: string;
  value?: string | number | boolean | null;
  required: boolean;
}

export interface AuraPreparedAction {
  id: string;

  type: AuraPreparedActionType;

  system:
    | 'aura_hcm'
    | 'aura_maintenance'
    | 'aura_signature';

  title: string;

  description: string;

  status: AuraPreparedActionStatus;

  confidence: number;

  requiresConfirmation: boolean;

  fields: AuraPreparedActionField[];
  
  createdAt: string;
}

export default {};