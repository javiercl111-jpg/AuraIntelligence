import type { IExecutiveReviewer } from './contracts/IExecutiveReviewer';
import type { GeneratedContentDraft, ExecutiveContentBrief, GenerationTrace, ReviewCategoryScore, ReviewEvidence, ReviewFinding, ReviewRecommendation } from '../types';

export class BriefReviewer implements IExecutiveReviewer {
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

    // Rule: BRIEF-01 - Core Message
    const coreMsg = brief.coreMessage.value?.toLowerCase() || '';
    if (coreMsg && !content.includes(coreMsg)) {
      const evId = `ev_brief_1_${Date.now()}`;
      evidence.push({
        id: evId,
        category: 'Brief Alignment',
        ruleId: 'BRIEF-01',
        severity: 'high',
        finding: 'Core message is missing or poorly articulated.',
        sourceArtifactType: 'ExecutiveContentBrief',
        sourceArtifactId: brief.id,
        sourceField: 'coreMessage',
        expectedValue: brief.coreMessage.value,
        observedValue: 'Missing',
        rationale: 'The draft does not explicitly contain the core message defined in the brief.'
      });
      findings.push({
        id: `fnd_brief_1_${Date.now()}`,
        type: 'violation',
        category: 'Brief Alignment',
        description: 'Failed to incorporate the core message.',
        evidenceIds: [evId]
      });
      recommendations.push({
        id: `rec_brief_1_${Date.now()}`,
        category: 'Brief Alignment',
        description: 'Rewrite the opening paragraph to explicitly include the core message.',
        findingIds: [`fnd_brief_1_${Date.now()}`],
        evidenceIds: [evId]
      });
      score -= 30;
    } else if (coreMsg) {
      const evId = `ev_brief_1_pass_${Date.now()}`;
      evidence.push({
        id: evId,
        category: 'Brief Alignment',
        ruleId: 'BRIEF-01',
        severity: 'info',
        finding: 'Core message strongly represented.',
        sourceArtifactType: 'ExecutiveContentBrief',
        sourceArtifactId: brief.id,
        sourceField: 'coreMessage',
        expectedValue: brief.coreMessage.value,
        observedValue: 'Present',
        rationale: 'Core message was found in the text.'
      });
      findings.push({
        id: `fnd_brief_1_pass_${Date.now()}`,
        type: 'strength',
        category: 'Brief Alignment',
        description: 'Excellent integration of the core message.',
        evidenceIds: [evId]
      });
    }

    // Rule: BRIEF-02 - Target Audience
    const audience = brief.targetAudience.value?.toLowerCase() || '';
    if (audience && !content.includes(audience.split(' ')[0])) {
      const evId = `ev_brief_2_${Date.now()}`;
      evidence.push({
        id: evId,
        category: 'Brief Alignment',
        ruleId: 'BRIEF-02',
        severity: 'medium',
        finding: 'Target audience alignment might be weak.',
        sourceArtifactType: 'ExecutiveContentBrief',
        sourceArtifactId: brief.id,
        sourceField: 'targetAudience',
        expectedValue: brief.targetAudience.value,
        observedValue: 'Weak alignment',
        rationale: 'Keywords relating to the target audience were not found.'
      });
      findings.push({
        id: `fnd_brief_2_${Date.now()}`,
        type: 'weakness',
        category: 'Brief Alignment',
        description: 'Tone or vocabulary may not resonate with the target audience.',
        evidenceIds: [evId]
      });
      score -= 15;
    }

    return {
      category: 'Brief Alignment',
      score: Math.max(0, score),
      maxScore: 100,
      weight: 25,
      findings,
      recommendations,
      evidence
    };
  }
}
