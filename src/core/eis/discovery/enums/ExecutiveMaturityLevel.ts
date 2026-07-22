export const ExecutiveMaturityLevel = {
  INITIAL: 'INITIAL',
  DEVELOPING: 'DEVELOPING',
  STRUCTURED: 'STRUCTURED',
  ADVANCED: 'ADVANCED',
  LEADING: 'LEADING',
} as const;

export type ExecutiveMaturityLevel =
  (typeof ExecutiveMaturityLevel)[keyof typeof ExecutiveMaturityLevel];
