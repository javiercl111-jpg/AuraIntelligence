import type {
    AuraPreparedAction,
    AuraPreparedActionField,
    AuraPreparedActionType,
  } from '../types/auraPreparedAction';
  
  const createActionId = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  
    return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  };
  
  const createAction = ({
    type,
    system,
    title,
    description,
    confidence,
    fields,
  }: {
    type: AuraPreparedActionType;
    system: 'aura_hcm' | 'aura_maintenance' | 'aura_signature';
    title: string;
    description: string;
    confidence: number;
    fields: AuraPreparedActionField[];
  }): AuraPreparedAction => {
    return {
      id: createActionId(),
      type,
      system,
      title,
      description,
      status: 'draft',
      confidence,
      requiresConfirmation: true,
      fields,
      createdAt: new Date().toISOString(),
    };
  };
  
  export const buildVacationRequestAction = (): AuraPreparedAction =>
    createAction({
      type: 'vacation_request',
      system: 'aura_hcm',
      title: 'Solicitud de Vacaciones',
      description:
        'Preparar una nueva solicitud de vacaciones para el colaborador.',
      confidence: 0.95,
      fields: [
        {
          key: 'startDate',
          label: 'Fecha inicio',
          required: true,
        },
        {
          key: 'endDate',
          label: 'Fecha fin',
          required: true,
        },
        {
          key: 'comments',
          label: 'Comentarios',
          required: false,
        },
      ],
    });
  
  export const buildPayrollRunAction = (): AuraPreparedAction =>
    createAction({
      type: 'payroll_run',
      system: 'aura_hcm',
      title: 'Corrida de Nómina',
      description:
        'Preparar una nueva corrida de nómina para revisión.',
      confidence: 0.9,
      fields: [
        {
          key: 'period',
          label: 'Periodo',
          required: true,
        },
        {
          key: 'payrollType',
          label: 'Tipo de nómina',
          required: true,
        },
      ],
    });
  
  export const buildWorkOrderAction = (): AuraPreparedAction =>
    createAction({
      type: 'work_order',
      system: 'aura_maintenance',
      title: 'Orden de Trabajo',
      description:
        'Preparar una nueva orden de trabajo.',
      confidence: 0.95,
      fields: [
        {
          key: 'location',
          label: 'Ubicación',
          required: true,
        },
        {
          key: 'asset',
          label: 'Activo',
          required: false,
        },
        {
          key: 'priority',
          label: 'Prioridad',
          required: true,
        },
        {
          key: 'description',
          label: 'Descripción',
          required: true,
        },
      ],
    });
  
  export const buildPreventiveWorkOrderAction =
    (): AuraPreparedAction =>
      createAction({
        type: 'preventive_work_order',
        system: 'aura_maintenance',
        title: 'Orden Preventiva',
        description:
          'Preparar una orden preventiva.',
        confidence: 0.95,
        fields: [
          {
            key: 'asset',
            label: 'Activo',
            required: true,
          },
          {
            key: 'maintenancePlan',
            label: 'Plan preventivo',
            required: true,
          },
        ],
      });
  
  export const buildSignatureDocumentAction =
    (): AuraPreparedAction =>
      createAction({
        type: 'signature_document',
        system: 'aura_signature',
        title: 'Documento para Firma',
        description:
          'Preparar documento para firma electrónica.',
        confidence: 0.95,
        fields: [
          {
            key: 'documentName',
            label: 'Documento',
            required: true,
          },
          {
            key: 'template',
            label: 'Plantilla',
            required: false,
          },
          {
            key: 'signers',
            label: 'Firmantes',
            required: true,
          },
        ],
      });

export const buildIncapacityRequestAction = (): AuraPreparedAction =>
  createAction({
    type: 'incapacity_request',
    system: 'aura_hcm',
    title: 'Registro de Incapacidad',
    description: 'Registrar una nueva incapacidad médica en el sistema.',
    confidence: 0.95,
    fields: [
      {
        key: 'startDate',
        label: 'Fecha inicio',
        required: true,
      },
      {
        key: 'endDate',
        label: 'Fecha fin',
        required: true,
      },
      {
        key: 'certificateNumber',
        label: 'Número de certificado',
        required: true,
      },
      {
        key: 'incapacityType',
        label: 'Tipo de incapacidad',
        required: true,
      },
    ],
  });

export const buildCreateEmployeeAction = (): AuraPreparedAction =>
  createAction({
    type: 'create_employee',
    system: 'aura_hcm',
    title: 'Alta de Empleado',
    description: 'Registrar un nuevo colaborador en la base de datos de Aura HCM.',
    confidence: 0.95,
    fields: [
      {
        key: 'fullName',
        label: 'Nombre completo',
        required: true,
      },
      {
        key: 'email',
        label: 'Correo electrónico',
        required: true,
      },
      {
        key: 'role',
        label: 'Puesto / Rol',
        required: true,
      },
      {
        key: 'salary',
        label: 'Salario diario',
        required: true,
      },
    ],
  });

export const buildPermissionRequestAction = (): AuraPreparedAction =>
  createAction({
    type: 'permission_request',
    system: 'aura_hcm',
    title: 'Solicitud de Permiso',
    description: 'Registrar una nueva solicitud de ausencia o permiso temporal.',
    confidence: 0.95,
    fields: [
      {
        key: 'date',
        label: 'Fecha de permiso',
        required: true,
      },
      {
        key: 'reason',
        label: 'Motivo del permiso',
        required: true,
      },
      {
        key: 'hours',
        label: 'Horas de permiso',
        required: false,
      },
    ],
  });

export const buildSignDocumentAction = (): AuraPreparedAction =>
  createAction({
    type: 'sign_document',
    system: 'aura_signature',
    title: 'Firma de Documento',
    description: 'Realizar la firma electrónica de un documento pendiente.',
    confidence: 0.95,
    fields: [
      {
        key: 'documentId',
        label: 'ID de Documento',
        required: true,
      },
      {
        key: 'signaturePin',
        label: 'PIN de Firma',
        required: true,
      },
    ],
  });

const builders = {
  buildVacationRequestAction,
  buildPayrollRunAction,
  buildWorkOrderAction,
  buildPreventiveWorkOrderAction,
  buildSignatureDocumentAction,
  buildIncapacityRequestAction,
  buildCreateEmployeeAction,
  buildPermissionRequestAction,
  buildSignDocumentAction,
};

export default builders;