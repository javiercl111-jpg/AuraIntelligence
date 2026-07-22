export const SecurityLogOutcome = {
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  AUTHORIZATION_FAILED: 'AUTHORIZATION_FAILED',
  AUTHORIZED: 'AUTHORIZED',
} as const;

export type SecurityLogOutcome =
  (typeof SecurityLogOutcome)[keyof typeof SecurityLogOutcome];

export interface SecurityLogEvent {
  readonly correlationId?: string;
  readonly requestId?: string;
  readonly callerSubject?: string;
  readonly issuer?: string;
  readonly audience?: readonly string[];
  readonly environment?: string;
  readonly tenantId?: string;
  readonly organizationId?: string;
  readonly companyId?: string;
  readonly outcome: SecurityLogOutcome;
  readonly errorCode?: string;
  readonly durationMs: number;
}

export interface SecurityLogSink {
  readonly write: (event: Readonly<Record<string, unknown>>) => void;
}

export interface SecurityLogger {
  readonly log: (event: SecurityLogEvent) => void;
}

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/;
const BEARER_PATTERN = /\bbearer\s+\S+/i;

function containsControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127;
  });
}

function sanitizeString(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (
    value.length === 0 ||
    value.length > 512 ||
    EMAIL_PATTERN.test(value) ||
    PHONE_PATTERN.test(value) ||
    BEARER_PATTERN.test(value) ||
    containsControlCharacter(value)
  ) {
    return undefined;
  }
  return value;
}

function assignString(
  target: Record<string, unknown>,
  key: string,
  value: string | undefined,
): void {
  const sanitized = sanitizeString(value);
  if (sanitized !== undefined) target[key] = sanitized;
}

export function sanitizeSecurityLogEvent(
  event: SecurityLogEvent,
): Readonly<Record<string, unknown>> {
  const sanitized: Record<string, unknown> = {
    outcome: event.outcome,
    durationMs:
      Number.isFinite(event.durationMs) && event.durationMs >= 0
        ? Math.round(event.durationMs)
        : 0,
  };

  assignString(sanitized, 'correlationId', event.correlationId);
  assignString(sanitized, 'requestId', event.requestId);
  assignString(sanitized, 'callerSubject', event.callerSubject);
  assignString(sanitized, 'issuer', event.issuer);
  assignString(sanitized, 'environment', event.environment);
  assignString(sanitized, 'tenantId', event.tenantId);
  assignString(sanitized, 'organizationId', event.organizationId);
  assignString(sanitized, 'companyId', event.companyId);
  assignString(sanitized, 'errorCode', event.errorCode);

  if (event.audience !== undefined) {
    const audience = event.audience
      .map((value) => sanitizeString(value))
      .filter((value): value is string => value !== undefined);
    if (audience.length > 0) sanitized.audience = audience;
  }

  return sanitized;
}

export function createSafeSecurityLogger(sink: SecurityLogSink): SecurityLogger {
  return {
    log: (event) => sink.write(sanitizeSecurityLogEvent(event)),
  };
}

export const consoleSecurityLogger: SecurityLogger = createSafeSecurityLogger({
  write: (event) => console.info('executive_discovery_security', event),
});
