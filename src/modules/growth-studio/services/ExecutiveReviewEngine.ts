import type { IExecutiveReviewer } from './contracts/IExecutiveReviewer';
import type {
  ExecutiveReviewReport,
  ReviewCategoryScore,
  ReviewFinding,
  ReviewRecommendation,
  ReviewStatus,
  GeneratedContentDraft,
  ExecutiveContentBrief,
  GenerationTrace
} from '../types';

import { BriefReviewer } from './BriefReviewer';
import { BrandReviewer } from './BrandReviewer';
import { GovernanceReviewer } from './GovernanceReviewer';
import { TraceabilityReviewer } from './TraceabilityReviewer';
import { QualityReviewer } from './QualityReviewer';

export class ExecutiveReviewEngine {
  private reviewers: IExecutiveReviewer[] = [];

  constructor() {
    // 6. Ejecutar reviewers en orden determinista
    this.reviewers = [
      new BriefReviewer(),
      new BrandReviewer(),
      new GovernanceReviewer(),
      new TraceabilityReviewer(),
      new QualityReviewer()
    ];
  }

  public async review(
    draft: Readonly<GeneratedContentDraft>,
    brief: Readonly<ExecutiveContentBrief>,
    traces: ReadonlyArray<GenerationTrace>
  ): Promise<ExecutiveReviewReport> {
    const categoryScores: ReviewCategoryScore[] = [];

    // Evaluate in order (Deterministic)
    for (const reviewer of this.reviewers) {
      const score = await reviewer.evaluate(draft, brief, traces);
      categoryScores.push(score);
    }

    // 7. Formula (Weighted sum)
    let overallScore = 0;
    let totalWeight = 0;

    let hasCriticalViolation = false;
    let hasHighViolation = false;

    const allFindings: ReviewFinding[] = [];
    const recommendations: ReviewRecommendation[] = [];
    let traceabilityCoverage = 100;
    let governanceCompliance = 100;

    for (const cat of categoryScores) {
      overallScore += (cat.score * cat.weight) / 100;
      totalWeight += cat.weight;

      if (cat.category === 'Traceability Coverage') {
        traceabilityCoverage = cat.score;
      }
      if (cat.category === 'Governance Compliance') {
        governanceCompliance = cat.score;
      }

      allFindings.push(...cat.findings);
      recommendations.push(...cat.recommendations);

      const violations = cat.findings.filter((f) => f.type === 'violation');
      for (const v of violations) {
        // Find evidence severity
        const evidence = cat.evidence.find((e) => v.evidenceIds.includes(e.id));
        if (evidence) {
          if (evidence.severity === 'critical') hasCriticalViolation = true;
          if (evidence.severity === 'high') hasHighViolation = true;
        }
      }
    }

    if (totalWeight > 0) {
      overallScore = Math.round((overallScore / totalWeight) * 100);
    } else {
      overallScore = 0;
    }

    // 8. Reglas de decisión
    let finalStatus: ReviewStatus = 'approved';

    // Draft technically invalid or corrupt -> rejected
    if (draft.status === 'rejected' || draft.generationValidation?.status === 'rejected' || draft.generatedContent.trim() === '') {
      finalStatus = 'rejected';
    }
    // critical violation -> rejected
    else if (hasCriticalViolation) {
      finalStatus = 'rejected';
    }
    // high blocking violation -> revision_required
    else if (hasHighViolation) {
      finalStatus = 'revision_required';
    }
    // score < 80 -> revision_required
    else if (overallScore < 80) {
      finalStatus = 'revision_required';
    }
    // score 80–89 sin bloqueos -> approved_with_observations
    else if (overallScore < 90) {
      finalStatus = 'approved_with_observations';
    }
    // score >= 90 sin violaciones -> approved
    else {
      const anyViolations = allFindings.some(f => f.type === 'violation');
      if (anyViolations) {
        finalStatus = 'approved_with_observations';
      }
    }

    const strengths = allFindings.filter(f => f.type === 'strength');
    const weaknesses = allFindings.filter(f => f.type === 'weakness');
    const violations = allFindings.filter(f => f.type === 'violation');

    const report: ExecutiveReviewReport = {
      reviewId: `rev_${Date.now()}`,
      draftId: draft.id,
      briefId: brief.id,
      generationRequestId: draft.generationRequestId,
      draftVersion: draft.generationVersion.toString(),
      overallScore,
      status: finalStatus,
      executiveSummary: `Review completed with status: ${finalStatus}. Score: ${overallScore}/100.`,
      strengths,
      weaknesses,
      violations,
      recommendations,
      categoryScores,
      traceabilityCoverage,
      governanceCompliance,
      humanReviewStatus: 'pending',
      reviewedAt: new Date().toISOString(),
      schemaVersion: '1.0'
    };

    return report;
  }
}
