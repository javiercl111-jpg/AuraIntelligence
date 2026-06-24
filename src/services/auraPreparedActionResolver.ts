import {
    buildPayrollRunAction,
    buildPreventiveWorkOrderAction,
    buildSignatureDocumentAction,
    buildVacationRequestAction,
    buildWorkOrderAction,
    buildIncapacityRequestAction,
    buildCreateEmployeeAction,
    buildPermissionRequestAction,
    buildSignDocumentAction,
  } from './auraPreparedActionBuilder';
  
  import type {
    AuraPreparedAction,
  } from '../types/auraPreparedAction';
  
  const normalizeText = (value: unknown): string =>
    String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  
  export const resolveAuraPreparedAction = (
    question: string
  ): AuraPreparedAction | null => {
    const text = normalizeText(question);
  
    if (
      text.includes('solicitar vacaciones') ||
      text.includes('pedir vacaciones') ||
      text.includes('crear solicitud de vacaciones') ||
      text.includes('preparar vacaciones')
    ) {
      return buildVacationRequestAction();
    }
  
    if (
      text.includes('corrida de nomina') ||
      text.includes('generar nomina') ||
      text.includes('crear nomina') ||
      text.includes('preparar nomina')
    ) {
      return buildPayrollRunAction();
    }
  
    if (
      text.includes('crear orden preventiva') ||
      text.includes('orden preventiva') ||
      text.includes('preparar preventivo') ||
      text.includes('mantenimiento preventivo')
    ) {
      return buildPreventiveWorkOrderAction();
    }
  
    if (
      text.includes('crear orden de trabajo') ||
      text.includes('levantar orden') ||
      text.includes('nueva orden') ||
      text.includes('reportar falla')
    ) {
      return buildWorkOrderAction();
    }
  
    if (
      text.includes('preparar documento para firma') ||
      text.includes('enviar a firma') ||
      text.includes('mandar a firma') ||
      text.includes('preparar contrato') ||
      text.includes('contrato para firma')
    ) {
      return buildSignatureDocumentAction();
    }

    if (
      text.includes('registrar incapacidad') ||
      text.includes('subir incapacidad') ||
      text.includes('incapacidad') ||
      text.includes('crear incapacidad')
    ) {
      return buildIncapacityRequestAction();
    }

    if (
      text.includes('alta de empleado') ||
      text.includes('crear empleado') ||
      text.includes('nuevo empleado') ||
      text.includes('alta empleado') ||
      text.includes('dar de alta')
    ) {
      return buildCreateEmployeeAction();
    }

    if (
      text.includes('solicitar permiso') ||
      text.includes('crear permiso') ||
      text.includes('pedir permiso') ||
      text.includes('permiso temporal') ||
      text.includes('ausencia')
    ) {
      return buildPermissionRequestAction();
    }

    if (
      text.includes('firmar documento') ||
      text.includes('firmar contrato') ||
      text.includes('realizar firma') ||
      text.includes('firma electronica')
    ) {
      return buildSignDocumentAction();
    }
  
    return null;
  };

export default resolveAuraPreparedAction;