import type { SecurityEnvironment } from './SecurityEnvironment';
import type { ServiceIdentityVerificationResult } from './ServiceIdentityVerificationResult';

export interface ServiceIdentityVerificationContext {
  readonly allowedIssuers: readonly string[];
  readonly allowedAudiences: readonly string[];
  readonly allowedSubjects: readonly string[];
  readonly environment: SecurityEnvironment;
  readonly subjectTenantGrants: Readonly<Record<string, readonly string[]>>;
  readonly subjectOrganizationGrants: Readonly<Record<string, readonly string[]>>;
  readonly subjectCompanyGrants?: Readonly<Record<string, readonly string[]>>;
  readonly clockSkewSeconds: number;
  readonly tokenMaxAgeSeconds: number;
  readonly claimsVersion: string;
}

export interface ServiceIdentityVerifier {
  readonly verify: (
    token: string,
    context: ServiceIdentityVerificationContext,
  ) => Promise<ServiceIdentityVerificationResult>;
}
