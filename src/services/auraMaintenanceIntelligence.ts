import type {
    AuraMaintenanceConnectorContext,
  } from '../types/auraMaintenanceConnector';
  
  const normalizeText = (value: unknown): string =>
    String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  
  export const answerAuraMaintenanceQuestion = ({
    question,
    context,
  }: {
    question: string;
    context: AuraMaintenanceConnectorContext;
  }): string | null => {
    const normalizedQuestion = normalizeText(question);
  
    if (
      normalizedQuestion.includes('ordenes abiertas') ||
      normalizedQuestion.includes('ordenes pendientes') ||
      normalizedQuestion.includes('ordenes activas')
    ) {
      return `Actualmente hay ${context.workOrders.totalOpen} órdenes abiertas en Aura Maintenance OS.`;
    }
  
    if (
      normalizedQuestion.includes('ordenes urgentes') ||
      normalizedQuestion.includes('urgentes')
    ) {
      return `Actualmente hay ${context.workOrders.totalUrgent} órdenes urgentes abiertas.`;
    }
  
    if (
      normalizedQuestion.includes('ordenes vencidas') ||
      normalizedQuestion.includes('vencidas') ||
      normalizedQuestion.includes('atrasadas')
    ) {
      return `Actualmente hay ${context.workOrders.totalOverdue} órdenes vencidas o atrasadas.`;
    }
  
    if (
      normalizedQuestion.includes('sin asignar') ||
      normalizedQuestion.includes('no asignadas')
    ) {
      return `Actualmente hay ${context.workOrders.totalUnassigned} órdenes sin asignar.`;
    }
  
    if (
      normalizedQuestion.includes('offline') ||
      normalizedQuestion.includes('sin conexion') ||
      normalizedQuestion.includes('sincronizar')
    ) {
      return `Actualmente hay ${context.workOrders.totalOfflinePendingSync} órdenes pendientes de sincronización offline.`;
    }
  
    if (
      normalizedQuestion.includes('activos fuera de servicio') ||
      normalizedQuestion.includes('fuera de servicio')
    ) {
      return `Actualmente hay ${context.assets.totalAssetsOutOfService} activos fuera de servicio.`;
    }
  
    if (
      normalizedQuestion.includes('activos en mantenimiento') ||
      normalizedQuestion.includes('mantenimiento')
    ) {
      return `Actualmente hay ${context.assets.totalAssetsInMaintenance} activos en mantenimiento.`;
    }
  
    if (
      normalizedQuestion.includes('activos criticos') ||
      normalizedQuestion.includes('activos críticos')
    ) {
      return `Actualmente hay ${context.assets.totalCriticalAssets} activos críticos registrados.`;
    }
  
    if (
      normalizedQuestion.includes('sin stock') ||
      normalizedQuestion.includes('agotados')
    ) {
      return `Actualmente hay ${context.inventory.outOfStockItems} artículos sin stock.`;
    }
  
    if (
      normalizedQuestion.includes('stock bajo') ||
      normalizedQuestion.includes('bajo inventario')
    ) {
      return `Actualmente hay ${context.inventory.lowStockItems} artículos con stock bajo.`;
    }
  
    if (
      normalizedQuestion.includes('preventivos vencidos') ||
      normalizedQuestion.includes('planes vencidos')
    ) {
      return `Actualmente hay ${context.preventive.overduePlans} planes preventivos vencidos.`;
    }
  
    if (
      normalizedQuestion.includes('preventivos proximos') ||
      normalizedQuestion.includes('preventivos próximos') ||
      normalizedQuestion.includes('por vencer')
    ) {
      return `Actualmente hay ${context.preventive.dueSoonPlans} planes preventivos próximos a vencer en los siguientes 7 días.`;
    }
  
    if (
      normalizedQuestion.includes('emergencias activas') ||
      normalizedQuestion.includes('emergencia activa')
    ) {
      return `Actualmente hay ${context.emergencies.activeEmergencies} emergencias activas.`;
    }
  
    return null;
  };