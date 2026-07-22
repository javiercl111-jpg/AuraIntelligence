import type { DiscoveryMetadata, ExecutiveDiscoveryEvidence } from './ExecutiveDiscoveryEvidence';

export const EXECUTIVE_DISCOVERY_SCHEMA_VERSION = '1.0' as const;
export const EXECUTIVE_DISCOVERY_CAPABILITY_VERSION = '1.0.0' as const;

export interface ExecutiveDiscoveryConsentAssertion {
  readonly receiptId: string;
  readonly privacyConsent: boolean;
  readonly diagnosticProcessingConsent: boolean;
  readonly marketingConsent?: boolean;
  readonly consentVersion: string;
  readonly capturedAt: string;
}

export interface ExecutiveDiscoveryRequest {
  readonly schemaVersion: typeof EXECUTIVE_DISCOVERY_SCHEMA_VERSION;
  readonly capabilityVersion: string;
  readonly requestId: string;
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly organizationId: string;
  readonly tenantId: string;
  readonly companyId: string;
  readonly sessionId: string;
  readonly discoveryDefinitionVersion: string;
  readonly locale: string;
  readonly requestedAt: string;
  readonly evidence: readonly ExecutiveDiscoveryEvidence[];
  readonly consentAssertion: Readonly<ExecutiveDiscoveryConsentAssertion>;
  readonly metadata?: DiscoveryMetadata;
}
