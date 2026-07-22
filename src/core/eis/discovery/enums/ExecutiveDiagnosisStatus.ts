export const ExecutiveDiagnosisStatus = {
  COMPLETE: 'COMPLETE',
  PARTIAL: 'PARTIAL',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
} as const;

export type ExecutiveDiagnosisStatus =
  (typeof ExecutiveDiagnosisStatus)[keyof typeof ExecutiveDiagnosisStatus];
