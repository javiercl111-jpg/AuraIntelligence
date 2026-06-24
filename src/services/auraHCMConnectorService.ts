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