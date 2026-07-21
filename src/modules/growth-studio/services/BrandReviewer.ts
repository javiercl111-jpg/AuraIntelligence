import type { IExecutiveReviewer } from './contracts/IExecutiveReviewer';
import type { GeneratedContentDraft, ExecutiveContentBrief, GenerationTrace, ReviewCategoryScore, ReviewEvidence, ReviewFinding, ReviewRecommendation } from '../types';

export class BrandReviewer implements IExecutiveReviewer {
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

    // Rule: BRAND-01 - Tone
    const tone = brief.tone?.value?.toLowerCase() || '';
    if (tone && content.includes('informal') && tone.includes('professional')) {
      const evId = `ev_brand_1_${Date.now()}`;
      evidence.push({
        id: evId,
        category: 'Brand Alignment',
        ruleId: 'BRAND-01',
        severity: 'high',
        finding: 'Tone mismatch detected (found informal tone when professional was requested).',
        sourceArtifactType: 'BrandBrain',
        sourceArtifactId: 'global_brand',
        sourceField: 'tone',
        expectedValue: brief.tone.value,
        observedValue: 'Informal terminology detected',
        rationale: 'The draft contains slang or informal structures violating the professional tone guideline.'
      });
      findings.push({
        id: `fnd_brand_1_${Date.now()}`,
        type: 'violation',
        category: 'Brand Alignment',
        description: 'Severe tone violation.',
        evidenceIds: [evId]
      });
      recommendations.push({
        id: `rec_brand_1_${Date.now()}`,
        category: 'Brand Alignment',
        description: 'Elevate the tone to match professional guidelines.',
        findingIds: [`fnd_brand_1_${Date.now()}`],
        evidenceIds: [evId]
      });
      score -= 30;
    }

    return {
      category: 'Brand Alignment',
      score: Math.max(0, score),
      maxScore: 100,
      weight: 20,
      findings,
      recommendations,
      evidence
    };
  }
}
