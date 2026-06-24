export interface AuraMaintenanceWorkOrdersContext {
    totalOpen: number;
    totalUrgent: number;
    totalOverdue: number;
    totalUnassigned: number;
    totalOfflinePendingSync: number;
  }
  
  export interface AuraMaintenanceAssetsContext {
    totalAssets: number;
    totalCriticalAssets: number;
    totalAssetsInMaintenance: number;
    totalAssetsOutOfService: number;
  }
  
  export interface AuraMaintenanceInventoryContext {
    totalItems: number;
    lowStockItems: number;
    outOfStockItems: number;
    totalEstimatedValue?: number;
  }
  
  export interface AuraMaintenanceLocationsContext {
    totalLocations: number;
    outOfServiceLocations: number;
    restrictedLocations: number;
    emergencyLocations: number;
  }
  
  export interface AuraMaintenancePreventiveContext {
    activePlans: number;
    overduePlans: number;
    dueSoonPlans: number;
  }
  
  export interface AuraMaintenanceEmergencyContext {
    activeEmergencies: number;
    openEmergencyOrders: number;
    completedEmergencyOrdersToday: number;
  }
  
  export interface AuraMaintenanceConnectorContext {
    companyId: string;
    generatedAt: string;
    workOrders: AuraMaintenanceWorkOrdersContext;
    assets: AuraMaintenanceAssetsContext;
    inventory: AuraMaintenanceInventoryContext;
    locations: AuraMaintenanceLocationsContext;
    preventive: AuraMaintenancePreventiveContext;
    emergencies: AuraMaintenanceEmergencyContext;
  }