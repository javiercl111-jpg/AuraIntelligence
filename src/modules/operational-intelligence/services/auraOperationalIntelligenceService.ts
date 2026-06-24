import {
  getPendingVacationRequests,
  getPendingPermissionRequests,
  getActiveIncapacities,
  getExpiringDocuments,
  getPendingAlerts,
} from '../../../services/auraHCMConnectorService';

import {
  getPendingSignaturesList,
  getExpiredSignaturesList,
} from '../../../services/auraSignatureConnectorService';

const normalizeText = (value: unknown): string =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const formatAlertRecord = (alert: any): string => {
  const source = alert.alertSource || '';
  if (source === 'VACATION') {
    return `- **[Vacaciones]** Solicitud de ${alert.employeeName || 'Empleado'} (${alert.startDate || 'N/D'} al ${alert.endDate || 'N/D'}) - ${alert.status || 'Pendiente'}`;
  }
  if (source === 'PERMISSION') {
    return `- **[Permiso]** Permiso de ${alert.employeeName || 'Empleado'} (${alert.startDate || 'N/D'} al ${alert.endDate || 'N/D'}) - ${alert.status || 'Pendiente'}`;
  }
  if (source === 'INCAPACITY') {
    return `- **[Incapacidad]** Incapacidad de ${alert.employeeName || 'Empleado'} (${alert.startDate || 'N/D'} al ${alert.endDate || 'N/D'}) - ${alert.recordStatus || 'Activo'}`;
  }
  if (source === 'SIGNATURE') {
    const title = alert.title || alert.documentName || 'Sin título';
    const empName = alert.assignedTo?.name || alert.employeeName || 'Empleado';
    return `- **[Firma]** Documento "${title}" asignado a ${empName} - ${alert.status || 'Pendiente'}`;
  }
  if (source === 'DOCUMENT') {
    const docName = alert.documentName || 'Documento';
    const empName = alert.employeeName || alert.name || 'Empleado';
    return `- **[Documento]** Vencimiento: "${docName}" de ${empName} (Días restantes: ${alert.daysLeft || alert.daysRemaining || 'N/D'})`;
  }
  if (source === 'ATTENDANCE') {
    const empName = alert.name || 'Empleado';
    return `- **[Asistencia]** Alerta: ${alert.alertType || 'Inconsistencia'} de ${empName} - ${alert.description || 'Detalle no especificado'}`;
  }
  return `- **[Alerta]** Pendiente: ${alert.description || alert.title || 'Detalle no especificado'}`;
};

const processListResults = (results: any[], formatter: (item: any) => string): string => {
  const hasMore = results.length > 5;
  const itemsToShow = results.slice(0, 5);
  const listStr = itemsToShow.map(formatter).join('\n');
  if (hasMore) {
    return listStr + '\n\n**Hay más resultados disponibles. Abre el módulo para revisarlos todos.**';
  }
  return listStr;
};

export const answerAuraOperationalQuestion = async ({
  question,
  companyId,
  employeeId,
  role,
}: {
  question: string;
  companyId: string;
  employeeId?: string;
  role?: string;
}): Promise<string | null> => {
  const text = normalizeText(question);

  // 1. ¿Qué pendientes tengo esta semana?
  if (
    text.includes('pendientes tengo esta semana') ||
    text.includes('pendientes esta semana') ||
    text.includes('mis pendientes') ||
    text.includes('pendientes de la semana')
  ) {
    const alerts = await getPendingAlerts(companyId, employeeId, role);
    if (alerts.length === 0) {
      return 'No tienes pendientes ni alertas operacionales críticas registradas para esta semana.';
    }
    const formatted = processListResults(alerts, formatAlertRecord);
    return `Aquí están tus pendientes y alertas operacionales para esta semana:\n\n${formatted}`;
  }

  // 2. ¿Qué firmas están pendientes?
  if (
    text.includes('firmas estan pendientes') ||
    text.includes('firmas pendientes') ||
    text.includes('documentos por firmar') ||
    text.includes('firmas tengo pendientes')
  ) {
    const list = await getPendingSignaturesList(companyId, employeeId, role);
    if (list.length === 0) {
      return 'No hay firmas pendientes registradas en este momento.';
    }
    const formatted = processListResults(list, (item) => {
      const title = item.title || item.documentName || 'Documento sin título';
      const dateStr = item.expiryDate || item.expiry_date || '';
      const expirationSuffix = dateStr ? ` (Vence: ${dateStr})` : '';
      return `- **"${title}"**${expirationSuffix} - Asignado a: ${item.assignedTo?.name || item.employeeName || 'Empleado'}`;
    });
    return `Los siguientes documentos están pendientes de firma:\n\n${formatted}`;
  }

  // 3. ¿Qué firmas están vencidas/expiradas?
  if (
    text.includes('firmas vencidas') ||
    text.includes('firmas expiradas') ||
    text.includes('documentos vencidos') ||
    text.includes('documentos expirados')
  ) {
    const list = await getExpiredSignaturesList(companyId, employeeId, role);
    if (list.length === 0) {
      return 'No hay documentos de firma expirados o rechazados recientemente.';
    }
    const formatted = processListResults(list, (item) => {
      const title = item.title || item.documentName || 'Documento sin título';
      const statusLabel = String(item.status || 'vencido').toUpperCase();
      return `- **"${title}"** - Estado: ${statusLabel}`;
    });
    return `Se encontraron los siguientes documentos expirados, cancelados o rechazados:\n\n${formatted}`;
  }

  // 4. ¿Qué vacaciones están pendientes?
  if (
    text.includes('vacaciones estan pendientes') ||
    text.includes('vacaciones pendientes') ||
    text.includes('solicitudes de vacaciones') ||
    text.includes('vacaciones por aprobar')
  ) {
    const list = await getPendingVacationRequests(companyId, employeeId, role);
    if (list.length === 0) {
      return 'No hay solicitudes de vacaciones pendientes de aprobación.';
    }
    const formatted = processListResults(list, (item) => {
      return `- Solicitud de **${item.employeeName || 'Empleado'}** por ${item.days || 0} días (${item.startDate} al ${item.endDate}) - Estado: ${item.status}`;
    });
    return `Las siguientes solicitudes de vacaciones están pendientes:\n\n${formatted}`;
  }

  // 5. ¿Qué permisos están pendientes?
  if (
    text.includes('permisos estan pendientes') ||
    text.includes('permisos pendientes') ||
    text.includes('solicitudes de permisos') ||
    text.includes('permisos por aprobar')
  ) {
    const list = await getPendingPermissionRequests(companyId, employeeId, role);
    if (list.length === 0) {
      return 'No hay solicitudes de permisos pendientes de aprobación.';
    }
    const formatted = processListResults(list, (item) => {
      return `- Permiso de **${item.employeeName || 'Empleado'}** (${item.startDate} al ${item.endDate}) - Motivo: ${item.permissionType || 'Personal'} - Estado: ${item.status}`;
    });
    return `Las siguientes solicitudes de permisos están pendientes:\n\n${formatted}`;
  }

  // 6. ¿Qué incapacidades están activas?
  if (
    text.includes('incapacidades estan activas') ||
    text.includes('incapacidades activas') ||
    text.includes('incapacidades vigentes') ||
    text.includes('quienes estan incapacitados')
  ) {
    const list = await getActiveIncapacities(companyId, employeeId, role);
    if (list.length === 0) {
      return 'No hay incapacidades activas registradas en este momento.';
    }
    const formatted = processListResults(list, (item) => {
      return `- Incapacidad de **${item.employeeName || 'Empleado'}** (${item.startDate} al ${item.endDate}) - Folio: ${item.folio || 'Sin Folio'} - Tipo: ${item.incapacityType || 'General'}`;
    });
    return `Las siguientes incapacidades médicas están activas:\n\n${formatted}`;
  }

  // 7. ¿Qué documentos vencen esta semana?
  if (
    text.includes('documentos vencen esta semana') ||
    text.includes('documentos por vencer') ||
    text.includes('vencimientos de esta semana') ||
    text.includes('vencen esta semana')
  ) {
    const list = await getExpiringDocuments(companyId, employeeId);
    if (list.length === 0) {
      return 'No hay alertas de documentos por vencer o vencidos esta semana.';
    }
    const formatted = processListResults(list, (item) => {
      return `- Documento de **${item.employeeName || item.name || 'Empleado'}** vencerá en ${item.daysLeft || 'N/D'} días (Vencimiento: ${item.expiryDate || 'N/D'})`;
    });
    return `Los siguientes documentos expiran próximamente o están vencidos:\n\n${formatted}`;
  }

  return null;
};

export default answerAuraOperationalQuestion;
