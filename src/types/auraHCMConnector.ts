import type {
    AuraUserRole,
  } from './auraIntelligence';
  
  export interface AuraHCMEmployeeContext {
    employeeId?: string;
    employeeNumber?: string;
    displayName?: string;
    email?: string;
    companyId?: string;
    departmentId?: string;
    positionId?: string;
    profileId?: string;
    role?: AuraUserRole;
    status?: 'active' | 'inactive' | string;
  }
  
  export interface AuraHCMProfileContext {
    profileId: string;
    name?: string;
    role?: AuraUserRole;
    permissions?: string[];
    isActive?: boolean;
  }
  
  export interface AuraHCMPermissionsContext {
    profileId?: string;
    role?: AuraUserRole;
    permissions: string[];
    canApproveVacations?: boolean;
    canManagePayroll?: boolean;
    canManageEmployees?: boolean;
    canViewReports?: boolean;
  }
  
  export interface AuraHCMCompanyContext {
    companyId: string;
    name?: string;
    aiEnabled?: boolean;
    modulesEnabled?: string[];
    features?: Record<string, boolean>;
  }
  
  export interface AuraHCMConnectorContext {
    employee: AuraHCMEmployeeContext | null;
    profile: AuraHCMProfileContext | null;
    permissions: AuraHCMPermissionsContext;
    company: AuraHCMCompanyContext | null;
  }