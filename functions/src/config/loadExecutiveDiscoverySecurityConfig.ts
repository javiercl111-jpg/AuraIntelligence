import {
  SecurityEnvironment,
  type DevelopmentServiceCredential,
  type SecurityEnvironment as SecurityEnvironmentType,
} from '../security';
import type { ExecutiveDiscoverySecurityConfig } from './ExecutiveDiscoverySecurityConfig';

export const ExecutiveDiscoverySecurityConfigErrorCode = {
  MISSING_VALUE: 'MISSING_VALUE',
  INVALID_ENVIRONMENT: 'INVALID_ENVIRONMENT',
  INVALID_LIST: 'INVALID_LIST',
  INVALID_GRANTS: 'INVALID_GRANTS',
  INVALID_BOOLEAN: 'INVALID_BOOLEAN',
  INVALID_NUMBER: 'INVALID_NUMBER',
  INVALID_DEVELOPMENT_CONFIG: 'INVALID_DEVELOPMENT_CONFIG',
  INVALID_OIDC_CONFIG: 'INVALID_OIDC_CONFIG',
  INSECURE_CONFIGURATION: 'INSECURE_CONFIGURATION',
} as const;

export type ExecutiveDiscoverySecurityConfigErrorCode =
  (typeof ExecutiveDiscoverySecurityConfigErrorCode)[keyof typeof ExecutiveDiscoverySecurityConfigErrorCode];

export class ExecutiveDiscoverySecurityConfigError extends Error {
  public constructor(
    public readonly code: ExecutiveDiscoverySecurityConfigErrorCode,
  ) {
    super(`Executive Discovery security configuration is invalid (${code}).`);
    this.name = 'ExecutiveDiscoverySecurityConfigError';
  }
}

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

function fail(code: ExecutiveDiscoverySecurityConfigErrorCode): never {
  throw new ExecutiveDiscoverySecurityConfigError(code);
}

function requiredString(value: string | undefined): string {
  if (value === undefined || value.trim().length === 0) {
    return fail(ExecutiveDiscoverySecurityConfigErrorCode.MISSING_VALUE);
  }
  return value.trim();
}

function parseEnvironment(value: string | undefined): SecurityEnvironmentType {
  if (
    value === SecurityEnvironment.DEVELOPMENT ||
    value === SecurityEnvironment.TEST ||
    value === SecurityEnvironment.PRODUCTION
  ) {
    return value;
  }
  return fail(ExecutiveDiscoverySecurityConfigErrorCode.INVALID_ENVIRONMENT);
}

function parseList(value: string | undefined): readonly string[] {
  const values = requiredString(value)
    .split(',')
    .map((entry) => entry.trim());
  if (
    values.length === 0 ||
    values.some((entry) => entry.length === 0) ||
    new Set(values).size !== values.length
  ) {
    return fail(ExecutiveDiscoverySecurityConfigErrorCode.INVALID_LIST);
  }
  return values;
}

function parseOptionalList(value: string | undefined): readonly string[] {
  return value === undefined ? [] : parseList(value);
}

function parseBoolean(value: string | undefined): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fail(ExecutiveDiscoverySecurityConfigErrorCode.INVALID_BOOLEAN);
}

function parseNonNegativeInteger(value: string | undefined): number {
  const parsed = Number(requiredString(value));
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    return fail(ExecutiveDiscoverySecurityConfigErrorCode.INVALID_NUMBER);
  }
  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJson(value: string | undefined): unknown {
  try {
    return JSON.parse(requiredString(value)) as unknown;
  } catch (error: unknown) {
    if (error instanceof ExecutiveDiscoverySecurityConfigError) throw error;
    return fail(ExecutiveDiscoverySecurityConfigErrorCode.INVALID_GRANTS);
  }
}

function parseGrants(
  value: string | undefined,
  allowedSubjects: readonly string[],
): Readonly<Record<string, readonly string[]>> {
  const parsed = parseJson(value);
  if (!isRecord(parsed)) {
    return fail(ExecutiveDiscoverySecurityConfigErrorCode.INVALID_GRANTS);
  }

  const grants: Record<string, readonly string[]> = {};
  for (const [subject, identifiers] of Object.entries(parsed)) {
    if (
      !allowedSubjects.includes(subject) ||
      !Array.isArray(identifiers) ||
      identifiers.some(
        (identifier) =>
          typeof identifier !== 'string' || identifier.trim().length === 0,
      ) ||
      new Set(identifiers).size !== identifiers.length
    ) {
      return fail(ExecutiveDiscoverySecurityConfigErrorCode.INVALID_GRANTS);
    }
    grants[subject] = identifiers;
  }

  if (allowedSubjects.some((subject) => !(subject in grants))) {
    return fail(ExecutiveDiscoverySecurityConfigErrorCode.INVALID_GRANTS);
  }
  return grants;
}

function parseOptionalGrants(
  value: string | undefined,
  allowedSubjects: readonly string[],
): Readonly<Record<string, readonly string[]>> | undefined {
  return value === undefined ? undefined : parseGrants(value, allowedSubjects);
}

function parseDevelopmentCredentials(
  value: string | undefined,
  allowedSubjects: readonly string[],
): readonly DevelopmentServiceCredential[] {
  if (value === undefined) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    return fail(
      ExecutiveDiscoverySecurityConfigErrorCode.INVALID_DEVELOPMENT_CONFIG,
    );
  }

  if (!Array.isArray(parsed)) {
    return fail(
      ExecutiveDiscoverySecurityConfigErrorCode.INVALID_DEVELOPMENT_CONFIG,
    );
  }

  const credentials: DevelopmentServiceCredential[] = [];
  for (const entry of parsed) {
    if (
      !isRecord(entry) ||
      typeof entry.token !== 'string' ||
      entry.token.length < 16 ||
      typeof entry.subject !== 'string' ||
      !allowedSubjects.includes(entry.subject)
    ) {
      return fail(
        ExecutiveDiscoverySecurityConfigErrorCode.INVALID_DEVELOPMENT_CONFIG,
      );
    }
    credentials.push({ token: entry.token, subject: entry.subject });
  }

  if (
    new Set(credentials.map((entry) => entry.token)).size !== credentials.length
  ) {
    return fail(
      ExecutiveDiscoverySecurityConfigErrorCode.INVALID_DEVELOPMENT_CONFIG,
    );
  }
  return credentials;
}

function parseOidcJwksUri(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username !== '' || url.password !== '') {
      return fail(ExecutiveDiscoverySecurityConfigErrorCode.INVALID_OIDC_CONFIG);
    }
    return url.toString();
  } catch (error: unknown) {
    if (error instanceof ExecutiveDiscoverySecurityConfigError) throw error;
    return fail(ExecutiveDiscoverySecurityConfigErrorCode.INVALID_OIDC_CONFIG);
  }
}

export function loadExecutiveDiscoverySecurityConfig(
  environmentSource: EnvironmentSource = process.env,
): ExecutiveDiscoverySecurityConfig {
  const environment = parseEnvironment(
    environmentSource.EIS_SECURITY_ENVIRONMENT,
  );
  const allowedSubjects = parseList(
    environmentSource.EIS_SECURITY_ALLOWED_SUBJECTS,
  );
  const allowDevelopmentVerifier = parseBoolean(
    environmentSource.EIS_SECURITY_ALLOW_DEVELOPMENT_VERIFIER,
  );
  const authorizationHeaderRequired = parseBoolean(
    environmentSource.EIS_SECURITY_AUTHORIZATION_HEADER_REQUIRED,
  );
  const developmentCredentials = parseDevelopmentCredentials(
    environmentSource.EIS_SECURITY_DEVELOPMENT_IDENTITIES,
    allowedSubjects,
  );
  const oidcJwksUri = parseOidcJwksUri(
    environmentSource.EIS_SECURITY_OIDC_JWKS_URI,
  );
  const oidcAlgorithms = parseOptionalList(
    environmentSource.EIS_SECURITY_OIDC_ALGORITHMS,
  );

  if (!authorizationHeaderRequired) {
    return fail(
      ExecutiveDiscoverySecurityConfigErrorCode.INSECURE_CONFIGURATION,
    );
  }

  if (
    allowDevelopmentVerifier &&
    (environment === SecurityEnvironment.PRODUCTION ||
      developmentCredentials.length === 0)
  ) {
    return fail(
      ExecutiveDiscoverySecurityConfigErrorCode.INVALID_DEVELOPMENT_CONFIG,
    );
  }

  if (
    !allowDevelopmentVerifier &&
    (oidcJwksUri === undefined || oidcAlgorithms.length === 0)
  ) {
    return fail(ExecutiveDiscoverySecurityConfigErrorCode.INVALID_OIDC_CONFIG);
  }

  return {
    environment,
    allowedIssuers: parseList(environmentSource.EIS_SECURITY_ALLOWED_ISSUERS),
    allowedAudiences: parseList(
      environmentSource.EIS_SECURITY_ALLOWED_AUDIENCES,
    ),
    allowedSubjects,
    subjectTenantGrants: parseGrants(
      environmentSource.EIS_SECURITY_SUBJECT_TENANT_GRANTS,
      allowedSubjects,
    ),
    subjectOrganizationGrants: parseGrants(
      environmentSource.EIS_SECURITY_SUBJECT_ORGANIZATION_GRANTS,
      allowedSubjects,
    ),
    subjectCompanyGrants: parseOptionalGrants(
      environmentSource.EIS_SECURITY_SUBJECT_COMPANY_GRANTS,
      allowedSubjects,
    ),
    allowDevelopmentVerifier,
    clockSkewSeconds: parseNonNegativeInteger(
      environmentSource.EIS_SECURITY_CLOCK_SKEW_SECONDS,
    ),
    tokenMaxAgeSeconds: parseNonNegativeInteger(
      environmentSource.EIS_SECURITY_TOKEN_MAX_AGE_SECONDS,
    ),
    claimsVersion: requiredString(
      environmentSource.EIS_SECURITY_CLAIMS_VERSION,
    ),
    authorizationHeaderRequired,
    ...(oidcJwksUri === undefined ? {} : { oidcJwksUri }),
    oidcAlgorithms,
    developmentCredentials,
  };
}
