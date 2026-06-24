import type {
    AuraPreparedAction,
  } from './auraPreparedAction';
  
  export type AuraCopilotExecutionMode =
    | 'draft_only'
    | 'requires_confirmation'
    | 'execute_after_confirmation';
  
  export type AuraCopilotExecutionStatus =
    | 'not_started'
    | 'draft_created'
    | 'waiting_confirmation'
    | 'executed'
    | 'blocked'
    | 'failed';
  
  export interface AuraCopilotExecutionRequest {
    tenantId: string;
    companyId: string;
    userId: string;
    userEmail?: string;
    role?: string;
    module?: string;
    preparedAction: AuraPreparedAction;
    mode: AuraCopilotExecutionMode;
  }
  
  export interface AuraCopilotExecutionResult {
    success: boolean;
    status: AuraCopilotExecutionStatus;
    message: string;
    draftId?: string;
    system: AuraPreparedAction['system'];
    actionType: AuraPreparedAction['type'];
    createdAt: string;
    metadata?: Record<string, unknown>;
  }

  export default {};