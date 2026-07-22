import { describe, expect, it, vi } from 'vitest';
import {
  createSafeSecurityLogger,
  SecurityLogOutcome,
  sanitizeSecurityLogEvent,
} from '../src/observability';

describe('safe security logging', () => {
  it('allowlists fields and removes tokens, headers, PII, and evidence values', () => {
    const unsafeEvent = {
      outcome: SecurityLogOutcome.AUTHORIZATION_FAILED,
      durationMs: 12.4,
      correlationId: 'correlation-001',
      callerSubject: 'personal.user@example.test',
      tenantId: '+52 55 1234 5678',
      issuer: 'https://issuer.example.test',
      audience: ['Bearer super-secret-token', 'aura-intelligence'],
      errorCode: 'TENANT_NOT_AUTHORIZED',
      authorization: 'Bearer super-secret-token',
      body: { email: 'personal.user@example.test' },
      evidence: 'Subscription revenue and private evidence value',
    };

    const serialized = JSON.stringify(sanitizeSecurityLogEvent(unsafeEvent));
    expect(serialized).toContain('correlation-001');
    expect(serialized).toContain('aura-intelligence');
    expect(serialized).not.toContain('Bearer');
    expect(serialized).not.toContain('super-secret-token');
    expect(serialized).not.toContain('authorization');
    expect(serialized).not.toContain('personal.user@example.test');
    expect(serialized).not.toContain('+52 55 1234 5678');
    expect(serialized).not.toContain('Subscription revenue');
    expect(serialized).not.toContain('evidence');
  });

  it('sanitizes before writing to the configured sink', () => {
    const write = vi.fn();
    const logger = createSafeSecurityLogger({ write });
    logger.log({
      outcome: SecurityLogOutcome.AUTHENTICATION_FAILED,
      errorCode: 'INVALID_TOKEN',
      callerSubject: 'private.person@example.test',
      durationMs: 0,
    });

    expect(write).toHaveBeenCalledWith({
      outcome: SecurityLogOutcome.AUTHENTICATION_FAILED,
      durationMs: 0,
      errorCode: 'INVALID_TOKEN',
    });
  });
});
