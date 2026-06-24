import {
    addDoc,
    collection,
    serverTimestamp,
  } from 'firebase/firestore';
  
  import { db } from '../firebase';
  
  import type {
    AuraCopilotExecutionRequest,
    AuraCopilotExecutionResult,
  } from '../types/auraCopilotExecution';
  
  import type {
    AuraPreparedAction,
  } from '../types/auraPreparedAction';
  
  const COPILOT_DRAFTS_COLLECTION = 'ai_copilot_drafts';
  
  const buildDraftTitle = (
    request: AuraCopilotExecutionRequest
  ): string => {
    return request.preparedAction.title;
  };
  
  const sanitizePreparedAction = (
    action: AuraPreparedAction
  ): AuraPreparedAction => {
    return {
      ...action,
      fields: action.fields.map((field) => ({
        key: field.key,
        label: field.label,
        value:
          field.value === undefined
            ? null
            : field.value,
        required: field.required,
      })),
    };
  };
  
  export const createAuraCopilotDraft = async (
    request: AuraCopilotExecutionRequest
  ): Promise<AuraCopilotExecutionResult> => {
    try {
      if (request.mode !== 'draft_only') {
        return {
          success: false,
          status: 'blocked',
          message:
            'Por seguridad, Aura Copilot V3 solo puede crear borradores en esta fase.',
          system: request.preparedAction.system,
          actionType: request.preparedAction.type,
          createdAt: new Date().toISOString(),
        };
      }
  
      const now = new Date().toISOString();
      const sanitizedPreparedAction = sanitizePreparedAction(
        request.preparedAction
      );
  
      const draftPayload = {
        tenantId: request.tenantId || 'unknown_tenant',
        companyId: request.companyId || 'unknown_company',
        userId: request.userId || 'unknown_user',
        userEmail: request.userEmail || null,
        role: request.role || 'unknown_role',
        module: request.module || 'general',
        system: sanitizedPreparedAction.system,
        actionType: sanitizedPreparedAction.type,
        title: buildDraftTitle({
          ...request,
          preparedAction: sanitizedPreparedAction,
        }),
        description: sanitizedPreparedAction.description,
        preparedAction: sanitizedPreparedAction,
        status: 'draft',
        mode: request.mode,
        requiresConfirmation: true,
        createdAt: now,
        updatedAt: now,
        createdAtServer: serverTimestamp(),
        updatedAtServer: serverTimestamp(),
        metadata: {
          source: 'aura_intelligence',
          safetyMode: 'draft_only',
          executionLayer: 'aura-copilot-execution-v1',
        },
      };
  
      const docRef = await addDoc(
        collection(db, COPILOT_DRAFTS_COLLECTION),
        draftPayload
      );
  
      return {
        success: true,
        status: 'draft_created',
        message:
          'Borrador creado correctamente. Debe ser revisado y confirmado antes de ejecutar cualquier acción real.',
        draftId: docRef.id,
        system: sanitizedPreparedAction.system,
        actionType: sanitizedPreparedAction.type,
        createdAt: now,
        metadata: {
          collection: COPILOT_DRAFTS_COLLECTION,
          safetyMode: 'draft_only',
        },
      };
    } catch (error) {
      console.error(
        '[Aura Copilot Execution] Error creating draft:',
        error
      );
  
      return {
        success: false,
        status: 'failed',
        message:
          error instanceof Error
            ? `No fue posible crear el borrador de Copilot: ${error.message}`
            : 'No fue posible crear el borrador de Copilot. Intenta de nuevo.',
        system: request.preparedAction.system,
        actionType: request.preparedAction.type,
        createdAt: new Date().toISOString(),
        metadata: {
          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
      };
    }
  };

export default createAuraCopilotDraft;