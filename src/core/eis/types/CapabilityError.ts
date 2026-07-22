export const CapabilityErrorCategory = {
  VALIDATION: 'VALIDATION',
  INTEGRITY: 'INTEGRITY',
  REASONING: 'REASONING',
  INTERNAL: 'INTERNAL',
} as const;

export type CapabilityErrorCategory =
  (typeof CapabilityErrorCategory)[keyof typeof CapabilityErrorCategory];

export type CapabilitySafeDetailValue =
  | string
  | number
  | boolean
  | null
  | readonly string[];

export interface CapabilityError {
  readonly code: string;
  readonly message: string;
  readonly category: CapabilityErrorCategory;
  readonly retryable: boolean;
  readonly safeDetails?: Readonly<Record<string, CapabilitySafeDetailValue>>;
}
