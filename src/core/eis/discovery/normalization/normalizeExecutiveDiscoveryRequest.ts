import type {
  DiscoveryJsonValue,
  DiscoveryMetadata,
  ExecutiveDiscoveryEvidence,
  ExecutiveDiscoveryRequest,
} from '../contracts';

function cloneJsonValue(value: DiscoveryJsonValue): DiscoveryJsonValue {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(cloneJsonValue);
  }

  const clone: Record<string, DiscoveryJsonValue> = {};
  Object.entries(value).forEach(([key, entryValue]) => {
    clone[key] = cloneJsonValue(entryValue);
  });
  return clone;
}

function normalizeMetadata(metadata: DiscoveryMetadata | undefined): DiscoveryMetadata | undefined {
  if (metadata === undefined || Object.keys(metadata).length === 0) {
    return undefined;
  }

  const normalized: Record<string, string | number | boolean | null> = {};
  Object.entries(metadata).forEach(([key, value]) => {
    normalized[key] = typeof value === 'string' ? value.trim() : value;
  });
  return normalized;
}

function normalizeLocale(locale: string): string {
  const segments = locale
    .trim()
    .replaceAll('_', '-')
    .split('-')
    .filter((segment) => segment.length > 0);

  return segments
    .map((segment, index) => {
      if (index === 0) return segment.toLowerCase();
      if (segment.length === 2 || /^\d{3}$/.test(segment)) return segment.toUpperCase();
      if (segment.length === 4) {
        return `${segment[0].toUpperCase()}${segment.slice(1).toLowerCase()}`;
      }
      return segment.toLowerCase();
    })
    .join('-');
}

function normalizeEvidence(evidence: ExecutiveDiscoveryEvidence): ExecutiveDiscoveryEvidence {
  const metadata = normalizeMetadata(evidence.metadata);
  return {
    evidenceId: evidence.evidenceId.trim(),
    sourceType: evidence.sourceType,
    sourceReference: evidence.sourceReference.trim(),
    ...(evidence.fieldId === undefined ? {} : { fieldId: evidence.fieldId.trim() }),
    ...(evidence.questionId === undefined ? {} : { questionId: evidence.questionId.trim() }),
    value: cloneJsonValue(evidence.value),
    ...(evidence.normalizedValue === undefined
      ? {}
      : { normalizedValue: cloneJsonValue(evidence.normalizedValue) }),
    capturedAt: evidence.capturedAt.trim(),
    classification: evidence.classification,
    consentScope: evidence.consentScope.trim(),
    confidence: evidence.confidence,
    ...(evidence.hash === undefined ? {} : { hash: evidence.hash.trim() }),
    ...(metadata === undefined ? {} : { metadata }),
  };
}

export function normalizeExecutiveDiscoveryRequest(
  request: ExecutiveDiscoveryRequest,
): ExecutiveDiscoveryRequest {
  const metadata = normalizeMetadata(request.metadata);
  const evidence = request.evidence
    .map((item, originalIndex) => ({
      item: normalizeEvidence(item),
      originalIndex,
    }))
    .sort((left, right) => {
      const capturedAtOrder = left.item.capturedAt.localeCompare(right.item.capturedAt);
      if (capturedAtOrder !== 0) return capturedAtOrder;
      const identifierOrder = left.item.evidenceId.localeCompare(right.item.evidenceId);
      return identifierOrder !== 0 ? identifierOrder : left.originalIndex - right.originalIndex;
    })
    .map(({ item }) => item);

  return {
    schemaVersion: request.schemaVersion,
    capabilityVersion: request.capabilityVersion.trim(),
    requestId: request.requestId.trim(),
    correlationId: request.correlationId.trim(),
    idempotencyKey: request.idempotencyKey.trim(),
    organizationId: request.organizationId.trim(),
    tenantId: request.tenantId.trim(),
    companyId: request.companyId.trim(),
    sessionId: request.sessionId.trim(),
    discoveryDefinitionVersion: request.discoveryDefinitionVersion.trim(),
    locale: normalizeLocale(request.locale),
    requestedAt: request.requestedAt.trim(),
    evidence,
    consentAssertion: {
      receiptId: request.consentAssertion.receiptId.trim(),
      privacyConsent: request.consentAssertion.privacyConsent,
      diagnosticProcessingConsent: request.consentAssertion.diagnosticProcessingConsent,
      ...(request.consentAssertion.marketingConsent === undefined
        ? {}
        : { marketingConsent: request.consentAssertion.marketingConsent }),
      consentVersion: request.consentAssertion.consentVersion.trim(),
      capturedAt: request.consentAssertion.capturedAt.trim(),
    },
    ...(metadata === undefined ? {} : { metadata }),
  };
}
