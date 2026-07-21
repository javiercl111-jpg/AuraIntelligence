export interface GenerationTrace {
  id: string;
  draftId: string;
  artifactType: string;
  artifactId: string;
  section: string;
  field: string;
  derivedFrom: string;
  transformation: string;
  reason: string;
  confidence: number;
}
