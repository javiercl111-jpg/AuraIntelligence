import type {
  DiscoveryJsonValue,
  DiscoveryMetadata,
  ExecutiveDiscoveryEvidence,
} from '../contracts';

const REDACTED_EMAIL = '[REDACTED_EMAIL]';
const REDACTED_PHONE = '[REDACTED_PHONE]';
const REDACTED_BEARER = '[REDACTED_BEARER_TOKEN]';
const REDACTED_TOKEN = '[REDACTED_TOKEN]';
const REDACTED_API_KEY = '[REDACTED_API_KEY]';

function redactString(value: string): string {
  return value
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, REDACTED_BEARER)
    .replace(
      /([?&](?:access_token|auth_token|token|api_key|apikey|key)=)[^&#\s]+/gi,
      `$1${REDACTED_TOKEN}`,
    )
    .replace(
      /\b(api[_-]?key|client[_-]?secret)(\s*[:=]\s*)[A-Za-z0-9._~+/=-]{8,}/gi,
      `$1$2${REDACTED_API_KEY}`,
    )
    .replace(/\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{8,}\b/g, REDACTED_API_KEY)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, REDACTED_EMAIL)
    .replace(
      /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)|\d{2,4})[\s.-]\d{3,4}[\s.-]\d{4}\b/g,
      REDACTED_PHONE,
    )
    .replace(/\b\d{10,15}\b/g, REDACTED_PHONE);
}

function redactJsonValue(value: DiscoveryJsonValue): DiscoveryJsonValue {
  if (typeof value === 'string') return redactString(value);
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(redactJsonValue);

  const redacted: Record<string, DiscoveryJsonValue> = {};
  Object.entries(value).forEach(([key, entryValue]) => {
    redacted[key] = redactJsonValue(entryValue);
  });
  return redacted;
}

function redactMetadata(metadata: DiscoveryMetadata | undefined): DiscoveryMetadata | undefined {
  if (metadata === undefined) return undefined;

  const redacted: Record<string, string | number | boolean | null> = {};
  Object.entries(metadata).forEach(([key, value]) => {
    redacted[key] = typeof value === 'string' ? redactString(value) : value;
  });
  return redacted;
}

export function redactDiscoveryEvidence(
  evidence: ExecutiveDiscoveryEvidence,
): ExecutiveDiscoveryEvidence {
  const metadata = redactMetadata(evidence.metadata);
  return {
    ...evidence,
    sourceReference: redactString(evidence.sourceReference),
    value: redactJsonValue(evidence.value),
    ...(evidence.normalizedValue === undefined
      ? {}
      : { normalizedValue: redactJsonValue(evidence.normalizedValue) }),
    ...(metadata === undefined ? {} : { metadata }),
  };
}
