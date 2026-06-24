import {
    collection,
    getDocs,
    query,
    where,
  } from 'firebase/firestore';
  
  import { db } from '../firebase';
  
  import type {
    AuraMaintenanceConnectorContext,
  } from '../types/auraMaintenanceConnector';
  
  const countCollectionByCompany = async (
    collectionName: string,
    companyId: string
  ): Promise<any[]> => {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, collectionName),
          where('companyId', '==', companyId)
        )
      );
  
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error(
        `[Aura Maintenance Connector] Error loading ${collectionName}:`,
        error
      );
  
      return [];
    }
  };
  
  const isToday = (value?: string): boolean => {
    if (!value) return false;
  
    const today = new Date().toISOString().slice(0, 10);
  
    return value.startsWith(today);
  };
  
  export const buildAuraMaintenanceConnectorContext = async (
    companyId: string
  ): Promise<AuraMaintenanceConnectorContext> => {
    const [
      workOrders,
      assets,
      inventory,
      locations,
      preventivePlans,
      emergencies,
    ] = await Promise.all([
      countCollectionByCompany('work_orders', companyId),
      countCollectionByCompany('assets', companyId),
      countCollectionByCompany('inventory_items', companyId),
      countCollectionByCompany('locations', companyId),
      countCollectionByCompany('preventive_plans', companyId),
      countCollectionByCompany('emergencies', companyId),
    ]);
  
    const openWorkOrders = workOrders.filter(
      (order) =>
        !['completed', 'cancelled', 'closed'].includes(
          String(order.status || '').toLowerCase()
        )
    );
  
    return {
      companyId,
      generatedAt: new Date().toISOString(),
  
      workOrders: {
        totalOpen: openWorkOrders.length,
        totalUrgent: openWorkOrders.filter(
          (order) =>
            String(order.priority || '').toLowerCase() === 'urgent' ||
            String(order.priority || '').toLowerCase() === 'high'
        ).length,
        totalOverdue: openWorkOrders.filter(
          (order) =>
            order.dueDate &&
            new Date(order.dueDate).getTime() < Date.now()
        ).length,
        totalUnassigned: openWorkOrders.filter(
          (order) => !order.assignedTo && !order.assignedUserId
        ).length,
        totalOfflinePendingSync: openWorkOrders.filter(
          (order) =>
            Boolean(order.pendingSync) ||
            Boolean(order.offlinePendingSync)
        ).length,
      },
  
      assets: {
        totalAssets: assets.length,
        totalCriticalAssets: assets.filter(
          (asset) =>
            String(asset.criticality || '').toLowerCase() === 'critical' ||
            String(asset.priority || '').toLowerCase() === 'critical'
        ).length,
        totalAssetsInMaintenance: assets.filter(
          (asset) =>
            String(asset.status || '').toLowerCase() === 'maintenance' ||
            String(asset.operationalStatus || '').toLowerCase() === 'maintenance'
        ).length,
        totalAssetsOutOfService: assets.filter(
          (asset) =>
            String(asset.status || '').toLowerCase() === 'out_of_service' ||
            String(asset.operationalStatus || '').toLowerCase() === 'out_of_service'
        ).length,
      },
  
      inventory: {
        totalItems: inventory.length,
        lowStockItems: inventory.filter((item) => {
          const stock = Number(item.stock ?? item.quantity ?? 0);
          const minStock = Number(item.minStock ?? item.minimumStock ?? 0);
  
          return minStock > 0 && stock <= minStock;
        }).length,
        outOfStockItems: inventory.filter((item) => {
          const stock = Number(item.stock ?? item.quantity ?? 0);
  
          return stock <= 0;
        }).length,
        totalEstimatedValue: inventory.reduce((sum, item) => {
          const stock = Number(item.stock ?? item.quantity ?? 0);
          const unitCost = Number(item.unitCost ?? item.cost ?? 0);
  
          return sum + stock * unitCost;
        }, 0),
      },
  
      locations: {
        totalLocations: locations.length,
        outOfServiceLocations: locations.filter(
          (location) =>
            String(location.status || '').toLowerCase() === 'out_of_service' ||
            String(location.operationalStatus || '').toLowerCase() ===
              'out_of_service'
        ).length,
        restrictedLocations: locations.filter(
          (location) =>
            String(location.status || '').toLowerCase() === 'restricted' ||
            String(location.operationalStatus || '').toLowerCase() ===
              'restricted'
        ).length,
        emergencyLocations: locations.filter(
          (location) =>
            String(location.status || '').toLowerCase() === 'emergency' ||
            String(location.operationalStatus || '').toLowerCase() ===
              'emergency'
        ).length,
      },
  
      preventive: {
        activePlans: preventivePlans.filter(
          (plan) =>
            String(plan.status || '').toLowerCase() !== 'inactive' &&
            String(plan.status || '').toLowerCase() !== 'archived'
        ).length,
        overduePlans: preventivePlans.filter(
          (plan) =>
            plan.nextDueDate &&
            new Date(plan.nextDueDate).getTime() < Date.now()
        ).length,
        dueSoonPlans: preventivePlans.filter((plan) => {
          if (!plan.nextDueDate) return false;
  
          const dueTime = new Date(plan.nextDueDate).getTime();
          const sevenDaysFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
  
          return dueTime >= Date.now() && dueTime <= sevenDaysFromNow;
        }).length,
      },
  
      emergencies: {
        activeEmergencies: emergencies.filter(
          (emergency) =>
            !['completed', 'cancelled', 'closed'].includes(
              String(emergency.status || '').toLowerCase()
            )
        ).length,
        openEmergencyOrders: openWorkOrders.filter(
          (order) =>
            Boolean(order.emergencyId) ||
            String(order.type || '').toLowerCase() === 'emergency'
        ).length,
        completedEmergencyOrdersToday: workOrders.filter(
          (order) =>
            (
              Boolean(order.emergencyId) ||
              String(order.type || '').toLowerCase() === 'emergency'
            ) &&
            ['completed', 'closed'].includes(
              String(order.status || '').toLowerCase()
            ) &&
            isToday(order.completedAt || order.closedAt || order.updatedAt)
        ).length,
      },
    };
  };