import type {
  DiscoveryEvidenceClassification,
  DiscoveryEvidenceSourceType,
} from '../enums';

export type DiscoveryJsonPrimitive = string | number | boolean | null;

export type DiscoveryJsonValue =
  | DiscoveryJsonPrimitive
  | readonly DiscoveryJsonValue[]
  | { readonly [key: string]: DiscoveryJsonValue };

export type DiscoveryMetadata = Readonly<Record<string, DiscoveryJsonPrimitive>>;

export interface ExecutiveDiscoveryEvidence {
  readonly evidenceId: string;
  readonly sourceType: DiscoveryEvidenceSourceType;
  readonly sourceReference: string;
  readonly fieldId?: string;
  readonly questionId?: string;
  readonly value: DiscoveryJsonValue;
  readonly normalizedValue?: DiscoveryJsonValue;
  readonly capturedAt: string;
  readonly classification: DiscoveryEvidenceClassification;
  readonly consentScope: string;
  readonly confidence: number;
  readonly hash?: string;
  readonly metadata?: DiscoveryMetadata;
}
