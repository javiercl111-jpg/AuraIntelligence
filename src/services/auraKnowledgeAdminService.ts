import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    setDoc,
  } from 'firebase/firestore';
  
  import { db } from '../firebase';
  
  import type { AuraKnowledgeArticle } from '../types/auraIntelligence';
  
  import {
    buildDefaultKnowledgeGovernance,
    incrementKnowledgeVersion,
  } from './auraKnowledgeGovernanceService';
  
  const KNOWLEDGE_COLLECTION = 'ai_knowledge_articles';
  
  export type AuraKnowledgeArticleInput = Omit<
    AuraKnowledgeArticle,
    'id' | 'createdAt' | 'updatedAt'
  > & {
    tenantId?: string;
    companyId?: string;
    createdBy?: string;
    governance?: unknown;
  };
  
  export const createKnowledgeArticle = async (
    article: AuraKnowledgeArticleInput
  ): Promise<string> => {
    const now = new Date().toISOString();
  
    const governance = buildDefaultKnowledgeGovernance({
      ownerId: article.createdBy,
      ownerEmail: undefined,
    });
  
    const docRef = await addDoc(collection(db, KNOWLEDGE_COLLECTION), {
      ...article,
      tags: article.tags || [],
      status: article.status || 'draft',
      governance: {
        ...governance,
        lifecycleStatus:
          article.status === 'published'
            ? 'published'
            : governance.lifecycleStatus,
      },
      createdAt: now,
      updatedAt: now,
      createdAtServer: serverTimestamp(),
      updatedAtServer: serverTimestamp(),
    });
  
    return docRef.id;
  };
  
  export const updateKnowledgeArticle = async (
    articleId: string,
    article: Partial<AuraKnowledgeArticleInput>
  ): Promise<void> => {
    const existingArticle = await getKnowledgeArticleById(articleId);
    const existingGovernance = (existingArticle as any)?.governance;
  
    await updateDoc(doc(db, KNOWLEDGE_COLLECTION, articleId), {
      ...article,
      governance: article.governance || incrementKnowledgeVersion(existingGovernance),
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    });
  };
  
  export const deleteKnowledgeArticle = async (
    articleId: string
  ): Promise<void> => {
    await deleteDoc(doc(db, KNOWLEDGE_COLLECTION, articleId));
  };
  
  export const getKnowledgeArticleById = async (
    articleId: string
  ): Promise<AuraKnowledgeArticle | null> => {
    try {
      const snapshot = await getDoc(doc(db, KNOWLEDGE_COLLECTION, articleId));
  
      if (!snapshot.exists()) return null;
  
      return {
        id: snapshot.id,
        ...(snapshot.data() as Omit<AuraKnowledgeArticle, 'id'>),
      };
    } catch (error) {
      console.error(
        '[Aura Intelligence] Error loading knowledge article:',
        error
      );
  
      return null;
    }
  };
  
  export const listKnowledgeArticles = async (): Promise<AuraKnowledgeArticle[]> => {
    try {
      const snapshot = await getDocs(
        query(collection(db, KNOWLEDGE_COLLECTION), orderBy('updatedAt', 'desc'))
      );
  
      return snapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Omit<AuraKnowledgeArticle, 'id'>),
      }));
    } catch (error) {
      console.error(
        '[Aura Intelligence] Error loading knowledge articles:',
        error
      );
  
      return [];
    }
  };

  const SEED_VERSION = '1.0.0';

  export const seedDefaultArticles = async (): Promise<void> => {
    try {
      const settingsRef = doc(db, 'ai_system_settings', 'defaultKnowledgeSeedVersion');
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists() && settingsSnap.data()?.version === SEED_VERSION) {
        console.log('[Aura Intelligence] Seed already applied. Version:', SEED_VERSION);
        return;
      }

      const existing = await listKnowledgeArticles();
      if (existing.length > 0) {
        console.log('[Aura Intelligence] Knowledge articles already exist. Skipping seed.');
        await setDoc(settingsRef, {
          version: SEED_VERSION,
          seededAt: new Date().toISOString(),
        });
        return;
      }

      console.log('[Aura Intelligence] Seeding default knowledge articles...');
      const articlesToSeed = [
        {
          title: 'Manual: Solicitud de Vacaciones en Aura HCM',
          system: 'aura_hcm',
          module: 'vacations',
          category: 'vacations',
          language: 'es',
          status: 'published',
          tags: ['vacaciones', 'solicitar vacaciones', 'dias descanso', 'pedir vacaciones'],
          content: `Qué hace:\nPermite registrar y solicitar días de descanso con goce de sueldo para los colaboradores.\n\nCuándo usarlo:\nCuando el colaborador requiera programar su período vacacional reglamentario o días de descanso acumulados.\n\nPaso a paso:\n1. Ingresar al módulo de Vacaciones en la barra de navegación de Aura HCM.\n2. Hacer clic en el botón 'Nueva Solicitud' en la esquina superior derecha.\n3. Seleccionar las fechas de inicio y fin en el calendario.\n4. Agregar comentarios opcionales justificando la solicitud y presionar 'Enviar'.\n\nRequisitos:\nTener saldo de días disponibles en tu perfil de colaborador y contar con la validación de tu jefe directo.\n\nBuenas prácticas:\nSolicitar el período de vacaciones con al menos 15 días de anticipación y coordinar las entregas y tareas pendientes con tu equipo de trabajo.`
        },
        {
          title: 'Manual: Gestión y Solicitud de Permisos en Aura HCM',
          system: 'aura_hcm',
          module: 'permissions',
          category: 'permissions',
          language: 'es',
          status: 'published',
          tags: ['permiso', 'permisos', 'ausencia', 'solicitar permiso', 'pedir permiso'],
          content: `Qué hace:\nRegistra ausencias temporales y permisos por horas o días (por motivos personales, médicos u oficiales) de forma justificada.\n\nCuándo usarlo:\nCuando necesites ausentarte temporalmente de tu puesto por causas justificadas ajenas a vacaciones o incapacidades médicas oficiales.\n\nPaso a paso:\n1. Navegar a la sección de Permisos en Aura HCM.\n2. Hacer clic en 'Nueva Solicitud'.\n3. Completar el formulario indicando la fecha del permiso, la cantidad de horas o días solicitados, y el motivo detallado.\n4. Adjuntar un archivo justificante si aplica (ej. cita médica o trámite oficial).\n5. Hacer clic en 'Enviar solicitud'.\n\nRequisitos:\nContar con una justificación válida y la autorización correspondiente de tu jefe directo y del equipo de Recursos Humanos.\n\nBuenas prácticas:\nRegistrar la solicitud con la mayor antelación posible y asegurarse de dar seguimiento a la aprobación antes del día de la ausencia para evitar reportes erróneos en el cálculo de nómina.`
        },
        {
          title: 'Manual: Registro de Incapacidades Médicas en Aura HCM',
          system: 'aura_hcm',
          module: 'incapacities',
          category: 'incapacities',
          language: 'es',
          status: 'published',
          tags: ['incapacidad', 'incapacidades', 'justificante medico', 'registrar incapacidad'],
          content: `Qué hace:\nRegistra las justificaciones médicas de inasistencia emitidas por la institución de seguridad social correspondiente.\n\nCuándo usarlo:\nAnte enfermedades generales, maternidad, accidentes o riesgos de trabajo que cuenten con un certificado oficial de incapacidad médica.\n\nPaso a paso:\n1. Ir al módulo de Incapacidades en Aura HCM.\n2. Hacer clic en 'Registrar Incapacidad'.\n3. Ingresar la fecha de inicio, la duración en días autorizada, el tipo de incapacidad (enfermedad general, maternidad, etc.) y el folio del certificado oficial.\n4. Cargar la imagen o documento del certificado médico digitalizado.\n5. Presionar 'Guardar Registro'.\n\nRequisitos:\nTener el folio del certificado médico oficial y el archivo digitalizado legible.\n\nBuenas prácticas:\nSubir el documento de incapacidad dentro de las primeras 24 horas del suceso para que el área de nómina realice el cálculo correcto del subsidio y justifique tus asistencias a tiempo.`
        },
        {
          title: 'Manual: Proceso de Firma Electrónica en Aura HCM y Aura Signature',
          system: 'aura_signature',
          module: 'documents',
          category: 'electronic_signature',
          language: 'es',
          status: 'published',
          tags: ['firmar documento', 'firma electronica', 'mis firmas', 'validar firma'],
          content: `Qué hace:\nPermite la firma digital y validación legal de contratos, reglamentos y acuerdos organizacionales dentro de la plataforma.\n\nCuándo usarlo:\nCuando Recursos Humanos o un tercero te asigne un documento pendiente de firma electrónica en el sistema.\n\nPaso a paso:\n1. Ir a 'Mis Firmas' en Aura HCM o entrar al centro de documentos de Aura Signature.\n2. Seleccionar el documento listado en estatus 'Pendiente de firma'.\n3. Leer detenidamente el contenido completo del documento.\n4. Ingresar tu PIN de seguridad de firma personal en el campo indicado.\n5. Hacer clic en el botón 'Confirmar Firma'.\n\nRequisitos:\nContar con tu PIN de seguridad de firma activo en tu perfil y un documento asignado para firma.\n\nBuenas prácticas:\nNunca compartas tu PIN de seguridad personal. Revisa con cuidado cada cláusula antes de proceder con la firma digital, ya que cuenta con plena validez legal.`
        },
        {
          title: 'Manual: Procesamiento y Corrida de Nómina en Aura HCM',
          system: 'aura_hcm',
          module: 'payroll',
          category: 'payroll',
          language: 'es',
          status: 'published',
          tags: ['generar nomina', 'crear nomina', 'payroll', 'corrida nomina', 'procesar nomina'],
          content: `Qué hace:\nRealiza el cálculo automático de percepciones, deducciones y dispersión de sueldos de los colaboradores.\n\nCuándo usarlo:\nAl final de cada período de pago configurado (semanal, quincenal o mensual) por parte del administrador de Recursos Humanos.\n\nPaso a paso:\n1. Acceder al módulo de Nómina en Aura HCM.\n2. Hacer clic en 'Nueva Corrida de Nómina'.\n3. Seleccionar el período de pago y el tipo de nómina correspondiente.\n4. Cargar y verificar las incidencias acumuladas en el período (faltas, permisos, incapacidades, horas extras).\n5. Procesar el cálculo y verificar la corrida preliminar antes de autorizar y timbrar los recibos oficiales.\n\nRequisitos:\nRol de administrador de RH con permisos para gestionar nómina y período fiscal activo.\n\nBuenas prácticas:\nRealizar una revisión exhaustiva de incidencias antes de procesar el cálculo final de nómina para evitar correcciones y retimbrados.`
        },
        {
          title: 'Manual: Alta y Creación de Empleados en Aura HCM',
          system: 'aura_hcm',
          module: 'employees',
          category: 'employee_management',
          language: 'es',
          status: 'published',
          tags: ['crear empleado', 'alta empleado', 'nuevo empleado', 'colaborador nuevo'],
          content: `Qué hace:\nAgrega un nuevo colaborador al sistema, configurando su perfil laboral, sueldo, departamento y accesos iniciales.\n\nCuándo usarlo:\nAl momento de la contratación de un nuevo integrante a la organización.\n\nPaso a paso:\n1. Ir al módulo de Gestión de Empleados en Aura HCM.\n2. Hacer clic en 'Alta Empleado' o 'Crear Empleado'.\n3. Completar los campos requeridos: nombre completo, correo electrónico, puesto/rol, y sueldo diario.\n4. Asignar el departamento correspondiente y guardar el registro.\n\nRequisitos:\nDatos personales completos del colaborador y contrato laboral formalizado.\n\nBuenas prácticas:\nVerificar que el correo electrónico institucional esté bien escrito para garantizar que el empleado reciba sus notificaciones de acceso y PIN de firma.`
        },
        {
          title: 'Manual: Revisión e Historial de Documentos en Aura Signature',
          system: 'aura_signature',
          module: 'documents',
          category: 'documents',
          language: 'es',
          status: 'published',
          tags: ['revisar documentos', 'historial documentos', 'documentos', 'verificar firma'],
          content: `Qué hace:\nPermite la búsqueda, descarga y auditoría de documentos, contratos y plantillas gestionados digitalmente.\n\nCuándo usarlo:\nCuando necesites consultar el historial de firmas de un colaborador, descargar un contrato firmado o verificar la integridad del sello digital.\n\nPaso a paso:\n1. Ingresar a Aura Signature y seleccionar el módulo 'Documentos'.\n2. Utilizar la barra de búsqueda o filtros superiores para localizar el documento por nombre, estatus o fecha.\n3. Hacer clic sobre el registro del documento para abrir el panel de detalles.\n4. Presionar 'Descargar PDF' para obtener la versión oficial con hoja de firmas y sello digital de seguridad.\n\nRequisitos:\nPermisos de visualización de documentos en tu perfil de usuario.\n\nBuenas prácticas:\nAgrupar los documentos bajo categorías claras y mantener el estatus actualizado para facilitar la auditoría de contratos.`
        },
        {
          title: 'Manual: Generación de Reportes Operativos en Aura',
          system: 'aura_hcm',
          module: 'reports',
          category: 'reports',
          language: 'es',
          status: 'published',
          tags: ['generar reportes', 'reportes', 'indicadores', 'reports'],
          content: `Qué hace:\nExporta indicadores clave y reportes en PDF/Excel sobre asistencia, incidencias de nómina y órdenes de mantenimiento.\n\nCuándo usarlo:\nAl cierre de cada mes o período operativo para el análisis de desempeño y presentación de resultados directivos.\n\nPaso a paso:\n1. Ir al módulo de Reportes del sistema respectivo (HCM o Maintenance OS).\n2. Seleccionar el tipo de reporte que deseas generar (ej. Reporte de Asistencia, Costos de Inventario, Órdenes Urgentes).\n3. Configurar los parámetros de fechas y filtros específicos.\n4. Hacer clic en 'Generar Reporte' y seleccionar la opción de descarga en PDF o CSV/Excel.\n\nRequisitos:\nPerfil administrativo con permisos de consulta y lectura de reportes habilitados.\n\nBuenas prácticas:\nProgramar la exportación del reporte de asistencia y nómina los primeros días del mes para contar con la información consolidada de incidencias.`
        }
      ];

      for (const article of articlesToSeed) {
        await createKnowledgeArticle(article as any);
      }

      await setDoc(settingsRef, {
        version: SEED_VERSION,
        seededAt: new Date().toISOString(),
      });

      console.log('[Aura Intelligence] Seeding completed successfully. Seed version:', SEED_VERSION);
    } catch (error) {
      console.error('[Aura Intelligence] Error seeding default articles:', error);
    }
  };

  const adminService = {
    createKnowledgeArticle,
    updateKnowledgeArticle,
    deleteKnowledgeArticle,
    getKnowledgeArticleById,
    listKnowledgeArticles,
    seedDefaultArticles,
  };

  export default adminService;