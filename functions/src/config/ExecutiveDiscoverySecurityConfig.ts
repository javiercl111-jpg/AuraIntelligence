import type { DevelopmentServiceCredential } from '../security';
import type { SecurityEnvironment } from '../security';

export interface ExecutiveDiscoverySecurityConfig {
  readonly environment: SecurityEnvironment;
  readonly allowedIssuers: readonly string[];
  readonly allowedAudiences: readonly string[];
  readonly allowedSubjects: readonly string[];
  readonly subjectTenantGrants: Readonly<Record<string, readonly string[]>>;
  readonly subjectOrganizationGrants: Readonly<Record<string, readonly string[]>>;
  readonly subjectCompanyGrants?: Readonly<Record<string, readonly string[]>>;
  readonly allowDevelopmentVerifier: boolean;
  readonly clockSkewSeconds: number;
  readonly tokenMaxAgeSeconds: number;
  readonly claimsVersion: string;
  readonly authorizationHeaderRequired: boolean;
  readonly oidcJwksUri?: string;
  readonly oidcAlgorithms: readonly string[];
  readonly developmentCredentials: readonly DevelopmentServiceCredential[];
}
