import type { SecurityEnvironment } from './SecurityEnvironment';

export const ServiceAuthenticationMethod = {
  OIDC: 'OIDC',
  DEVELOPMENT: 'DEVELOPMENT',
  TEST: 'TEST',
} as const;

export type ServiceAuthenticationMethod =
  (typeof ServiceAuthenticationMethod)[keyof typeof ServiceAuthenticationMethod];

export interface ServiceIdentity {
  readonly subject: string;
  readonly issuer: string;
  readonly audience: readonly string[];
  readonly authenticationMethod: ServiceAuthenticationMethod;
  readonly environment: SecurityEnvironment;
  readonly authorizedTenantIds: readonly string[];
  readonly authorizedOrganizationIds: readonly string[];
  readonly authorizedCompanyIds?: readonly string[];
  readonly issuedAt?: number;
  readonly expiresAt?: number;
  readonly tokenId?: string;
  readonly claimsVersion: string;
}
