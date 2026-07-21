import { describe, it, expect, beforeEach } from 'vitest';
import type { GeneratedContentDraft, ExecutiveContentBrief, GenerationTrace } from '../types';
import { ExecutiveReviewEngine } from '../services/ExecutiveReviewEngine';

describe('ExecutiveReviewEngine™ (Growth-08B)', () => {
  let engine: ExecutiveReviewEngine;
  let mockDraft: GeneratedContentDraft;
  let mockBrief: ExecutiveContentBrief;
  let mockTraces: GenerationTrace[];

  beforeEach(() => {
    engine = new ExecutiveReviewEngine();

    mockDraft = {
      id: 'draft_1',
      briefId: 'brief_1',
      generationRequestId: 'req_1',
      provider: 'google_gemini',
      model: 'gemini-1.5-pro',
      providerVersion: '1.0',
      generationVersion: 1,
      instructionVersion: 1,
      providerInstructionId: 'instr_1',
      traceabilityHash: 'hash',
      generatedAt: new Date().toISOString(),
      generationDuration: 1000,
      status: 'generated',
      generatedContent: 'A professional and accurate draft that includes the core message.',
      generationWarnings: [],
      generationValidation: {
        status: 'generated',
        score: 100,
        warnings: [],
        violations: [],
        recommendations: []
      },
      generationTrace: [],
      schemaVersion: '1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Casting slightly for mock simplicity since these are deeply nested
    mockBrief = {
      id: 'brief_1',
      coreMessage: { value: 'core message', status: 'ready' },
      targetAudience: { value: 'professional', status: 'ready' },
      tone: { value: 'professional', status: 'ready' },
      constraints: [{ id: '1', type: 'negative', description: 'no numbers', status: 'ready' }]
    } as unknown as ExecutiveContentBrief;

    mockTraces = [
      { id: 't1', draftId: 'draft_1', section: 'sec1', field: 'coreMessage', derivedFrom: '', transformation: 'direct', artifactType: 'Brief', artifactId: 'brief_1', reason: '', confidence: 100 },
      { id: 't2', draftId: 'draft_1', section: 'sec2', field: 'targetAudience', derivedFrom: '', transformation: 'direct', artifactType: 'Brief', artifactId: 'brief_1', reason: '', confidence: 100 }
    ];
  });

  it('evaluates a clean draft correctly (approved)', async () => {
    const report = await engine.review(mockDraft, mockBrief, mockTraces);

    expect(report.status).toBe('approved');
    expect(report.overallScore).toBeGreaterThanOrEqual(90);
    expect(report.humanReviewStatus).toBe('pending'); // Always pending initially
  });

  it('forces rejected if draft is empty (QualityReviewer)', async () => {
    mockDraft.generatedContent = '   ';
    const report = await engine.review(mockDraft, mockBrief, mockTraces);

    expect(report.status).toBe('rejected');
    const qualViolation = report.violations.find(v => v.category === 'Quality & Structure');
    expect(qualViolation).toBeDefined();
  });

  it('detects missing core message (BriefReviewer) -> revision_required', async () => {
    mockDraft.generatedContent = 'Just some random text missing the key point.';
    const report = await engine.review(mockDraft, mockBrief, mockTraces);

    expect(report.overallScore).toBeLessThan(100);
    expect(report.status).toBe('revision_required');

    const briefRec = report.recommendations.find(r => r.category === 'Brief Alignment');
    expect(briefRec).toBeDefined();
    // Evidence check
    expect(briefRec?.evidenceIds.length).toBeGreaterThan(0);
  });

  it('detects governance violations (critical) -> rejected', async () => {
    mockDraft.generatedContent = 'We guarantee 100% accurate results.';
    const report = await engine.review(mockDraft, mockBrief, mockTraces);

    expect(report.status).toBe('rejected');
    const govViolation = report.violations.find(v => v.category === 'Governance & Compliance');
    expect(govViolation).toBeDefined();
    expect(report.overallScore).toBeGreaterThan(0);
  });

  it('detects brief constraint violation in governance -> revision_required', async () => {
    mockDraft.generatedContent = 'This is a test with 123 numbers.';
    const report = await engine.review(mockDraft, mockBrief, mockTraces);

    const govViolationEvidence = report.categoryScores.flatMap(cs => cs.evidence).find(e => e.ruleId === 'GOV-02');
    expect(govViolationEvidence).toBeDefined();
  });

  it('detects tone mismatch (BrandReviewer) -> revision_required', async () => {
    mockDraft.generatedContent = 'Hey dudes, this is super informal and cool. the core message is here.';
    const report = await engine.review(mockDraft, mockBrief, mockTraces);

    expect(report.status).toBe('revision_required');
    expect(report.violations.find(v => v.category === 'Brand Alignment')).toBeDefined();
  });

  it('brand missing tone does not penalize (BrandReviewer)', async () => {
    delete (mockBrief as unknown as Record<string, unknown>).tone;
    const report = await engine.review(mockDraft, mockBrief, mockTraces);
    expect(report.violations.find(v => v.category === 'Brand Alignment')).toBeUndefined();
    expect(report.overallScore).toBeGreaterThanOrEqual(90);
  });

  it('quality reviewer detects duplicate content', async () => {
    mockDraft.generatedContent = 'This is a very long line to pass length checks. \n This is a very long line to pass length checks. \n This is a very long line to pass length checks.';
    const report = await engine.review(mockDraft, mockBrief, mockTraces);

    const weaknessEvidence = report.categoryScores.flatMap(cs => cs.evidence).find(e => e.ruleId === 'QUALITY-03');
    expect(weaknessEvidence).toBeDefined();
  });

  it('quality reviewer short asset valid', async () => {
    (mockBrief as unknown as Record<string, unknown>).selectedAsset = { title: 'Tweet' };
    mockDraft.generatedContent = 'Short tweet 15 chars';
    const report = await engine.review(mockDraft, mockBrief, mockTraces);

    const violationEvidence = report.categoryScores.flatMap(cs => cs.evidence).find(e => e.ruleId === 'QUALITY-02');
    expect(violationEvidence).toBeUndefined();
  });

  it('traceability coverage calculates correctly', async () => {
    // 1 trace for 2 sections (BriefReviewer has evaluableSections = 2 mocked)
    const report = await engine.review(mockDraft, mockBrief, [mockTraces[0]]);

    expect(report.traceabilityCoverage).toBe(50);
    expect(report.weaknesses.find(w => w.category === 'Traceability Coverage')).toBeDefined();
    // With one weakness but score > 90, it might be approved_with_observations or revision_required depending on score
  });

  it('rejects if draft was technically invalid (GenerationValidator)', async () => {
    mockDraft.generationValidation!.status = 'rejected';
    const report = await engine.review(mockDraft, mockBrief, mockTraces);
    expect(report.status).toBe('rejected');
  });

  it('guarantees deep immutability (Readonly)', async () => {
    const originalDraft = JSON.stringify(mockDraft);
    const originalBrief = JSON.stringify(mockBrief);
    const originalTraces = JSON.stringify(mockTraces);

    await engine.review(mockDraft, mockBrief, mockTraces);

    expect(JSON.stringify(mockDraft)).toBe(originalDraft);
    expect(JSON.stringify(mockBrief)).toBe(originalBrief);
    expect(JSON.stringify(mockTraces)).toBe(originalTraces);
  });

});
