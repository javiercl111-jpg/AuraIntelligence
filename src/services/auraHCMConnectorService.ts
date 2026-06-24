import {
    collection,
    getDocs,
    limit,
    query,
    where,
  } from 'firebase/firestore';
  
  import { db } from '../firebase';
  
  import type {
    AuraHCMCompanyContext,
    AuraHCMConnectorContext,
    AuraHCMEmployeeContext,
    AuraHCMPermissionsContext,
    AuraHCMProfileContext,
  } from '../types/auraHCMConnector';
  
  import type {
    AuraUserRole,
  } from '../types/auraIntelligence';
  
  const normalizePermissions = (permissions: unknown): string[] => {
    if (!Array.isArray(permissions)) return [];
  
    return permissions
      .map((permission) => String(permission || '').trim())
      .filter(Boolean);
  };
  
  const inferPermissionsContext = ({
    profileId,
    role,
    permissions,
  }: {
    profileId?: string;
    role?: AuraUserRole;
    permissions: string[];
  }): AuraHCMPermissionsContext => {
    const normalizedRole = String(role || '').toLowerCase();
  
    return {
      profileId,
      role,
      permissions,
      canApproveVacations:
        permissions.includes('vacations.approve') ||
        permissions.includes('vacations:approve') ||
        normalizedRole.includes('rh') ||
        normalizedRole.includes('hr') ||
        normalizedRole.includes('admin'),
      canManagePayroll:
        permissions.includes('payroll.manage') ||
        permissions.includes('payroll:manage') ||
        normalizedRole.includes('rh') ||
        normalizedRole.includes('hr') ||
        normalizedRole.includes('admin'),
      canManageEmployees:
        permissions.includes('employees.manage') ||
        permissions.includes('employees:manage') ||
        normalizedRole.includes('rh') ||
        normalizedRole.includes('hr') ||
        normalizedRole.includes('admin'),
      canViewReports:
        permissions.includes('reports.view') ||
        permissions.includes('reports:view') ||
        normalizedRole.includes('director') ||
        normalizedRole.includes('admin'),
    };
  };
  
  const findEmployeeByEmail = async (
    email?: string
  ): Promise<AuraHCMEmployeeContext | null> => {
    if (!email) return null;
  
    try {
      const snapshot = await getDocs(
        query(
          collection(db, 'employees'),
          where('email', '==', email),
          limit(1)
        )
      );
  
      const doc = snapshot.docs[0];
  
      if (!doc) return null;
  
      const data = doc.data();
  
      return {
        employeeId: doc.id,
        employeeNumber: data.employeeNumber || data.number || data.employeeNo,
        displayName:
          data.displayName ||
          data.fullName ||
          [data.firstName, data.lastName].filter(Boolean).join(' '),
        email: data.email,
        companyId: data.companyId,
        departmentId: data.departmentId,
        positionId: data.positionId,
        profileId: data.profileId,
        role: data.role,
        status: data.status || data.employeeStatus,
      };
    } catch (error) {
      console.error('[Aura HCM Connector] Error loading employee:', error);
  
      return null;
    }
  };
  
  const findProfileById = async (
    profileId?: string
  ): Promise<AuraHCMProfileContext | null> => {
    if (!profileId) return null;
  
    try {
      const snapshot = await getDocs(
        query(
          collection(db, 'profiles'),
          where('__name__', '==', profileId),
          limit(1)
        )
      );
  
      const doc = snapshot.docs[0];
  
      if (!doc) return null;
  
      const data = doc.data();
  
      return {
        profileId: doc.id,
        name: data.name || data.displayName,
        role: data.role,
        permissions: normalizePermissions(data.permissions),
        isActive: data.isActive !== false,
      };
    } catch (error) {
      console.error('[Aura HCM Connector] Error loading profile:', error);
  
      return null;
    }
  };
  
  const findCompanyById = async (
    companyId?: string
  ): Promise<AuraHCMCompanyContext | null> => {
    if (!companyId) return null;
  
    try {
      const snapshot = await getDocs(
        query(
          collection(db, 'companies'),
          where('__name__', '==', companyId),
          limit(1)
        )
      );
  
      const doc = snapshot.docs[0];
  
      if (!doc) return null;
  
      const data = doc.data();
  
      return {
        companyId: doc.id,
        name: data.name || data.companyName || data.legalName,
        aiEnabled: Boolean(data.aiEnabled || data.features?.aiEnabled),
        modulesEnabled: Array.isArray(data.modulesEnabled)
          ? data.modulesEnabled
          : [],
        features: data.features || {},
      };
    } catch (error) {
      console.error('[Aura HCM Connector] Error loading company:', error);
  
      return null;
    }
  };
  
  export const buildAuraHCMConnectorContext = async ({
    userEmail,
    fallbackCompanyId,
    fallbackRole,
    fallbackProfileId,
    fallbackPermissions = [],
  }: {
    userEmail?: string;
    fallbackCompanyId?: string;
    fallbackRole?: AuraUserRole;
    fallbackProfileId?: string;
    fallbackPermissions?: string[];
  }): Promise<AuraHCMConnectorContext> => {
    const employee = await findEmployeeByEmail(userEmail);
  
    const profile = await findProfileById(
      employee?.profileId || fallbackProfileId
    );
  
    const permissions = inferPermissionsContext({
      profileId: employee?.profileId || profile?.profileId || fallbackProfileId,
      role: employee?.role || profile?.role || fallbackRole,
      permissions: [
        ...normalizePermissions(fallbackPermissions),
        ...normalizePermissions(profile?.permissions),
      ],
    });
  
    const company = await findCompanyById(
      employee?.companyId || fallbackCompanyId
    );
  
    return {
      employee,
      profile,
      permissions,
      company,
    };
  };

  const isManagementRole = (role?: string): boolean => {
    const normalized = String(role || '').toUpperCase();
    return [
      'SUPER_ADMIN',
      'ADMIN',
      'RH',
      'HR',
      'HR_MANAGER',
      'HR_ADMIN',
      'DIRECTOR',
      'DIRECTOR_GENERAL',
    ].includes(normalized);
  };

  export const getPendingVacationRequests = async (
    companyId: string,
    employeeId?: string,
    role?: string
  ): Promise<any[]> => {
    if (!db) return [];
    try {
      const isMgmt = isManagementRole(role);
      const qConstraints = [
        where('companyId', '==', companyId),
        where('status', 'in', ['PENDING', 'PENDING_DIRECTOR', 'PENDING_RH']),
        limit(6),
      ];

      if (!isMgmt && employeeId) {
        qConstraints.push(where('employeeId', '==', employeeId));
      }

      const q = query(collection(db, 'vacation_requests'), ...qConstraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('[Aura HCM Connector] Error in getPendingVacationRequests:', error);
      return [];
    }
  };

  export const getPendingPermissionRequests = async (
    companyId: string,
    employeeId?: string,
    role?: string
  ): Promise<any[]> => {
    if (!db) return [];
    try {
      const isMgmt = isManagementRole(role);
      const qConstraints = [
        where('companyId', '==', companyId),
        where('status', 'in', ['PENDING', 'PENDING_RH']),
        limit(6),
      ];

      if (!isMgmt && employeeId) {
        qConstraints.push(where('employeeId', '==', employeeId));
      }

      const q = query(collection(db, 'permission_requests'), ...qConstraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('[Aura HCM Connector] Error in getPendingPermissionRequests:', error);
      return [];
    }
  };

  export const getActiveIncapacities = async (
    companyId: string,
    employeeId?: string,
    role?: string
  ): Promise<any[]> => {
    if (!db) return [];
    try {
      const isMgmt = isManagementRole(role);
      const qConstraints = [
        where('companyId', '==', companyId),
        where('recordStatus', '==', 'ACTIVE'),
        limit(6),
      ];

      if (!isMgmt && employeeId) {
        qConstraints.push(where('employeeId', '==', employeeId));
      }

      const q = query(collection(db, 'incapacity_requests'), ...qConstraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('[Aura HCM Connector] Error in getActiveIncapacities:', error);
      return [];
    }
  };

  export const getExpiringDocuments = async (
    companyId: string,
    employeeId?: string
  ): Promise<any[]> => {
    if (!db) return [];
    try {
      const qConstraints = [
        where('companyId', '==', companyId),
        where('isOperationalAlertActive', '==', true),
        limit(6),
      ];

      if (employeeId) {
        qConstraints.push(where('employeeId', '==', employeeId));
      }

      const q = query(collection(db, 'document_expiry_alerts_log'), ...qConstraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('[Aura HCM Connector] Error in getExpiringDocuments:', error);
      return [];
    }
  };

  export const getPendingAlerts = async (
    companyId: string,
    employeeId?: string,
    role?: string
  ): Promise<any[]> => {
    if (!db) return [];
    try {
      const isMgmt = isManagementRole(role);
      const limitVal = 6;

      const safeQuery = async (colName: string, path?: string) => {
        try {
          const qConstraints = [
            where('isOperationalAlertActive', '==', true),
            limit(limitVal),
          ];

          if (!path) {
            qConstraints.push(where('companyId', '==', companyId));
          }

          if (!isMgmt && employeeId) {
            qConstraints.push(where('employeeId', '==', employeeId));
          }

          const colRef = path ? collection(db, path) : collection(db, colName);
          const q = query(colRef, ...qConstraints);
          const snapshot = await getDocs(q);
          return snapshot.docs.map((doc) => ({
            id: doc.id,
            alertSource: colName
              .toUpperCase()
              .replace('_REQUESTS', '')
              .replace('_ALERTS_LOG', '')
              .replace('_ALERTS', ''),
            ...doc.data(),
          }));
        } catch (err) {
          console.warn(`[Aura HCM Connector] Failed safeQuery for ${colName}:`, err);
          return [];
        }
      };

      const [
        attendance,
        documents,
        vacations,
        permissions,
        incapacities,
        signatures,
      ] = await Promise.all([
        safeQuery('attendance_alerts'),
        safeQuery('document_expiry_alerts_log'),
        safeQuery('vacation_requests'),
        safeQuery('permission_requests'),
        safeQuery('incapacity_requests'),
        safeQuery('signatureDocuments', `companies/${companyId}/signatureDocuments`),
      ]);

      return [
        ...attendance,
        ...documents,
        ...vacations,
        ...permissions,
        ...incapacities,
        ...signatures,
      ];
    } catch (error) {
      console.error('[Aura HCM Connector] Error in getPendingAlerts:', error);
      return [];
    }
  };

  const hcmConnectorService = {
    buildAuraHCMConnectorContext,
    getPendingVacationRequests,
    getPendingPermissionRequests,
    getActiveIncapacities,
    getExpiringDocuments,
    getPendingAlerts,
  };

  export default hcmConnectorService;