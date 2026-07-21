export const ExecutiveCapabilityType = {
  MEMORY: 'MEMORY',
  REASONING: 'REASONING',
  REFLECTION: 'REFLECTION',
  GENERATION: 'GENERATION',
  REVIEW: 'REVIEW',
} as const;

export type ExecutiveCapabilityType = (typeof ExecutiveCapabilityType)[keyof typeof ExecutiveCapabilityType];
