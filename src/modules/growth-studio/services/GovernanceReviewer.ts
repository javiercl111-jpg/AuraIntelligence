import type { IExecutiveReviewer } from './contracts/IExecutiveReviewer';
import type { GeneratedContentDraft, ExecutiveContentBrief, GenerationTrace, ReviewCategoryScore, ReviewEvidence, ReviewFinding, ReviewRecommendation } from '../types';

export class GovernanceReviewer implements IExecutiveReviewer {
  public async evaluate(
    draft: Readonly<GeneratedContentDraft>,
    brief: Readonly<ExecutiveContentBrief>,
    _traces: ReadonlyArray<GenerationTrace>
  ): Promise<ReviewCategoryScore> {
    void _traces;
    const evidence: ReviewEvidence[] = [];
    const findings: ReviewFinding[] = [];
    const recommendations: ReviewRecommendation[] = [];
    let score = 100;

    const content = draft.generatedContent.toLowerCase();

    // GOV-01 - Prohibited words (Mocking legal/governance)
    const prohibitedWords = ['guarantee', '100% accurate'];
    for (const word of prohibitedWords) {
      if (content.includes(word)) {
        const evId = `ev_gov_1_${word}_${Date.now()}`;
        evidence.push({
          id: evId,
          category: 'Governance & Compliance',
          ruleId: 'GOV-01',
          severity: 'critical', // Critical violation -> Rejected
          finding: `Found prohibited promise/guarantee: "${word}"`,
          sourceArtifactType: 'Policy',
          sourceArtifactId: 'aura_governance',
          sourceField: 'prohibited_terms',
          expectedValue: 'Absence of absolute guarantees',
          observedValue: `Detected: ${word}`,
          rationale: 'Aura governance prohibits generating absolute guarantees.'
        });
        findings.push({
          id: `fnd_gov_1_${word}_${Date.now()}`,
          type: 'violation',
          category: 'Governance & Compliance',
          description: `Critical compliance violation: unauthorized claim (${word}).`,
          evidenceIds: [evId]
        });
        score -= 50;
      }
    }

    // GOV-02 - Brief Constraints
    const constraints = brief.constraints || [];
    for (const constraint of constraints) {
      if (constraint.description.toLowerCase().includes('no numbers') && /\d/.test(content)) {
        const evId = `ev_gov_2_${constraint.id}_${Date.now()}`;
        evidence.push({
          id: evId,
          category: 'Governance & Compliance',
          ruleId: 'GOV-02',
          severity: 'high',
          finding: `Constraint violation: "${constraint.description}"`,
          sourceArtifactType: 'ExecutiveContentBrief',
          sourceArtifactId: brief.id,
          sourceField: 'constraints',
          expectedValue: constraint.description,
          observedValue: `Found numbers in content`,
          rationale: 'Draft violates an explicit negative constraint.'
        });
        findings.push({
          id: `fnd_gov_2_${constraint.id}_${Date.now()}`,
          type: 'violation',
          category: 'Governance & Compliance',
          description: `Constraint ignored: ${constraint.description}`,
          evidenceIds: [evId]
        });
        score -= 30;
      }
    }

    return {
      category: 'Governance Compliance',
      score: Math.max(0, score),
      maxScore: 100,
      weight: 25,
      findings,
      recommendations,
      evidence
    };
  }
}
