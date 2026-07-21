export type ReviewStatus = 'approved' | 'approved_with_observations' | 'revision_required' | 'rejected';
export type ReviewSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type ReviewFindingType = 'strength' | 'weakness' | 'violation';

export interface ReviewEvidence {
  id: string;
  category: string;
  ruleId: string;
  severity: ReviewSeverity;
  finding: string;
  draftSection?: string;
  draftExcerpt?: string;
  sourceArtifactType: string;
  sourceArtifactId: string;
  sourceField: string;
  expectedValue: unknown;
  observedValue: unknown;
  rationale: string;
}

export interface ReviewFinding {
  id: string;
  type: ReviewFindingType;
  category: string;
  description: string;
  evidenceIds: string[];
}

export interface ReviewRecommendation {
  id: string;
  category: string;
  description: string;
  findingIds: string[];
  evidenceIds: string[];
}

export interface ReviewCategoryScore {
  category: string;
  score: number; // 0-100
  maxScore: number;
  weight: number; // 0-100 percentage
  findings: ReviewFinding[];
  recommendations: ReviewRecommendation[];
  evidence: ReviewEvidence[];
}

export interface ExecutiveReviewReport {
  reviewId: string;
  draftId: string;
  briefId: string;
  generationRequestId: string;
  draftVersion: string;
  overallScore: number; // 0-100
  status: ReviewStatus;
  executiveSummary: string;
  strengths: ReviewFinding[];
  weaknesses: ReviewFinding[];
  violations: ReviewFinding[];
  recommendations: ReviewRecommendation[];
  categoryScores: ReviewCategoryScore[];
  traceabilityCoverage: number; // 0-100 percentage
  governanceCompliance: number; // 0-100 percentage
  humanReviewStatus: 'pending' | 'approved' | 'rejected';
  reviewedAt: string;
  schemaVersion: string;
}
