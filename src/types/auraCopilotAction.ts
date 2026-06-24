export type AuraCopilotActionType =
  | 'prepare_form'
  | 'create_draft'
  | 'navigation'
  | 'recommendation'
  | 'blocked';

export type AuraCopilotActionStatus =
  | 'suggested'
  | 'prepared'
  | 'requires_confirmation'
  | 'executed'
  | 'cancelled'
  | 'blocked';

export interface AuraCopilotActionPayload {
  system: string;
  moduleId?: string;
  route?: string;
  title: string;
  description: string;
  fields?: Record<string, unknown>;
}

export interface AuraCopilotActionPlan {
  id: string;
  type: AuraCopilotActionType;
  status: AuraCopilotActionStatus;
  confidence: number;
  requiresConfirmation: boolean;
  payload: AuraCopilotActionPayload;
  safetyNotes: string[];
}