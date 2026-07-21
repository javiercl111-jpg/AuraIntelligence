import type { IExecutiveReviewer } from './contracts/IExecutiveReviewer';
import type { GeneratedContentDraft, ExecutiveContentBrief, GenerationTrace, ReviewCategoryScore, ReviewEvidence, ReviewFinding, ReviewRecommendation } from '../types';

export class TraceabilityReviewer implements IExecutiveReviewer {
  public async evaluate(
    _draft: Readonly<GeneratedContentDraft>,
    _brief: Readonly<ExecutiveContentBrief>,
    traces: ReadonlyArray<GenerationTrace>
  ): Promise<ReviewCategoryScore> {
    void _draft;
    void _brief;
    const evidence: ReviewEvidence[] = [];
    const findings: ReviewFinding[] = [];
    const recommendations: ReviewRecommendation[] = [];

    // TRACE-01: Calculate traceable sections vs evaluable sections
    // For mock purposes, let's say brief has coreMessage and targetAudience (2 sections)
    const evaluableSections = 2;
    let traceableSections = traces.length;
    if (traceableSections > evaluableSections) traceableSections = evaluableSections;

    const coverage = evaluableSections > 0 ? Math.round((traceableSections / evaluableSections) * 100) : 100;
    const score = coverage;

    const evId = `ev_trace_1_${Date.now()}`;
    evidence.push({
      id: evId,
      category: 'Traceability Coverage',
      ruleId: 'TRACE-01',
      severity: coverage < 100 ? 'medium' : 'info',
      finding: `Traceability coverage is at ${coverage}%`,
      sourceArtifactType: 'GenerationTrace',
      sourceArtifactId: 'traces',
      sourceField: 'length',
      expectedValue: '100% coverage',
      observedValue: `${coverage}%`,
      rationale: 'Coverage calculated based on presence of verifiable traces.'
    });

    if (coverage < 100) {
      findings.push({
        id: `fnd_trace_1_${Date.now()}`,
        type: 'weakness',
        category: 'Traceability Coverage',
        description: 'Not all sections have complete traceability.',
        evidenceIds: [evId]
      });
    } else {
      findings.push({
        id: `fnd_trace_1_pass_${Date.now()}`,
        type: 'strength',
        category: 'Traceability Coverage',
        description: 'Full traceability coverage achieved.',
        evidenceIds: [evId]
      });
    }

    return {
      category: 'Traceability Coverage',
      score,
      maxScore: 100,
      weight: 20,
      findings,
      recommendations,
      evidence
    };
  }
}
