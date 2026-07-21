import type { IExecutiveReviewer } from './contracts/IExecutiveReviewer';
import type { GeneratedContentDraft, ExecutiveContentBrief, GenerationTrace, ReviewCategoryScore, ReviewEvidence, ReviewFinding, ReviewRecommendation } from '../types';

export class QualityReviewer implements IExecutiveReviewer {
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

    const content = draft.generatedContent;

    // QUALITY-01 - Content is not empty
    if (!content || content.trim().length === 0) {
      const evId = `ev_qual_1_${Date.now()}`;
      evidence.push({
        id: evId,
        category: 'Quality & Structure',
        ruleId: 'QUALITY-01',
        severity: 'critical',
        finding: 'Generated content is completely empty.',
        sourceArtifactType: 'GeneratedContentDraft',
        sourceArtifactId: draft.id,
        sourceField: 'generatedContent',
        expectedValue: 'Non-empty string',
        observedValue: 'Empty string',
        rationale: 'Empty drafts are inherently invalid.'
      });
      findings.push({
        id: `fnd_qual_1_${Date.now()}`,
        type: 'violation',
        category: 'Quality & Structure',
        description: 'Content is empty.',
        evidenceIds: [evId]
      });
      score -= 100;
    } else {
       // QUALITY-02 - Length depends on assetType
       const assetType = brief.selectedAsset?.title?.toLowerCase() || 'unknown';
       const minLength = assetType.includes('tweet') || assetType.includes('social') ? 10 : 50;

       if (content.length < minLength) {
         const evId = `ev_qual_2_${Date.now()}`;
         evidence.push({
           id: evId,
           category: 'Quality & Structure',
           ruleId: 'QUALITY-02',
           severity: 'high',
           finding: `Content is suspiciously short for asset type ${assetType}.`,
           sourceArtifactType: 'GeneratedContentDraft',
           sourceArtifactId: draft.id,
           sourceField: 'generatedContent.length',
           expectedValue: `> ${minLength} characters`,
           observedValue: `${content.length} characters`,
           rationale: `Content shorter than ${minLength} characters lacks sufficient substance for this asset.`
         });
         findings.push({
           id: `fnd_qual_2_${Date.now()}`,
           type: 'violation',
           category: 'Quality & Structure',
           description: 'Content lacks substance (too short).',
           evidenceIds: [evId]
         });
         score -= 40;
       }

       // QUALITY-03 - Duplicate sections (mocked by checking duplicate lines)
       const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 20);
       const uniqueLines = new Set(lines);
       if (lines.length > uniqueLines.size) {
         const evId = `ev_qual_3_${Date.now()}`;
         evidence.push({
           id: evId,
           category: 'Quality & Structure',
           ruleId: 'QUALITY-03',
           severity: 'medium',
           finding: `Duplicate content sections detected.`,
           sourceArtifactType: 'GeneratedContentDraft',
           sourceArtifactId: draft.id,
           sourceField: 'generatedContent',
           expectedValue: `No duplicate lines > 20 chars`,
           observedValue: `Duplicate found`,
           rationale: `Repetitive content hurts readability.`
         });
         findings.push({
           id: `fnd_qual_3_${Date.now()}`,
           type: 'weakness',
           category: 'Quality & Structure',
           description: 'Duplicate content detected.',
           evidenceIds: [evId]
         });
         score -= 20;
       }
    }

    return {
      category: 'Quality & Structure',
      score: Math.max(0, score),
      maxScore: 100,
      weight: 10,
      findings,
      recommendations,
      evidence
    };
  }
}
