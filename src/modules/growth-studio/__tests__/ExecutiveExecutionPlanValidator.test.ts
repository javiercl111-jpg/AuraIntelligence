import { describe, it, expect } from 'vitest';
import { calculateExecutionReadiness } from '../services/ExecutiveExecutionPlanValidator';
import type { ExecutiveExecutionPlan } from '../types/executiveExecutionPlan';

describe('ExecutiveExecutionPlanValidator', () => {
  const basePlan: ExecutiveExecutionPlan = {
    id: '1',
    conversationId: '1',
    status: 'draft',
    schemaVersion: '1.0',
    createdAt: '',
    updatedAt: '',
    executionGoal: { value: 'Goal', status: 'confirmed' },
    businessJustification: { value: 'Justification', status: 'confirmed' },
    strategicPhases: [],
    executivePriorities: { value: ['Channel'], status: 'confirmed' },
    actionQueue: [
      { id: '1', title: 'Action', phase: 'preparation', status: 'not_started', priority: 'high', dependencyIds: [] }
    ],
    campaignLaunchInputs: { value: ['Input'], status: 'confirmed' },
    dependencies: [
      { id: 'd1', description: 'Dep 1', requiredForPhase: 'preparation', criticality: 'blocker', status: 'resolved' }
    ],
    knownDependencies: [
      { id: 'd1', description: 'Dep 1', requiredForPhase: 'preparation', criticality: 'blocker', status: 'resolved' }
    ],
    missingDependencies: [],
    executionRisks: [],
    executionReadiness: 0,
    executionReadinessReason: '',
    isBlocked: false,
    nextRecommendedAction: null
  };

  it('calculates 100% when everything is confirmed and resolved', () => {
    const result = calculateExecutionReadiness(basePlan);
    expect(result.score).toBe(100);
    expect(result.isBlocked).toBe(false);
  });

  it('blocks the plan if a blocker dependency is unresolved', () => {
    const blockedPlan: ExecutiveExecutionPlan = {
      ...basePlan,
      missingDependencies: [
        { id: 'd2', description: 'Missing Dep', requiredForPhase: 'preparation', criticality: 'blocker', status: 'unresolved' }
      ]
    };

    const result = calculateExecutionReadiness(blockedPlan);
    expect(result.isBlocked).toBe(true);
    expect(result.reason).toContain('bloqueada por dependencias críticas');
  });

  it('blocks the plan if executionGoal is missing', () => {
    const noGoalPlan: ExecutiveExecutionPlan = {
      ...basePlan,
      executionGoal: { value: null, status: 'missing' }
    };

    const result = calculateExecutionReadiness(noGoalPlan);
    expect(result.isBlocked).toBe(true);
    // Even if other fields give it a > 0 score, the plan is blocked
  });

  it('ignores executionConstraints for the score', () => {
    const planWithConstraints: ExecutiveExecutionPlan = {
      ...basePlan,
      executionConstraints: { budget: '1000' } // Should not affect score
    };

    const result1 = calculateExecutionReadiness(basePlan);
    const result2 = calculateExecutionReadiness(planWithConstraints);

    expect(result1.score).toBe(result2.score);
  });

  it('blocks the plan if actionQueue is empty', () => {
    const emptyActionQueuePlan: ExecutiveExecutionPlan = {
      ...basePlan,
      actionQueue: []
    };
    const result = calculateExecutionReadiness(emptyActionQueuePlan);
    expect(result.isBlocked).toBe(true);
  });

  it('applies exact executionRisks multipliers', () => {
    // 1.0 (no risks)
    const resultNoRisks = calculateExecutionReadiness(basePlan);
    
    // 0.4 (has risks, but not critical unmitigated)
    const planWithParialRisks: ExecutiveExecutionPlan = {
      ...basePlan,
      executionRisks: [{ id: '1', description: 'Risk', severity: 'medium', mitigationStatus: 'unmitigated' }]
    };
    const resultPartialRisks = calculateExecutionReadiness(planWithParialRisks);
    expect(resultPartialRisks.score).toBe(resultNoRisks.score - 6); // 10 * 1.0 vs 10 * 0.4 = 10 vs 4 (diff 6)
    
    // 0.0 (has critical unmitigated risk)
    const planWithCriticalRisk: ExecutiveExecutionPlan = {
      ...basePlan,
      executionRisks: [{ id: '1', description: 'Risk', severity: 'critical', mitigationStatus: 'unmitigated' }]
    };
    const resultCriticalRisk = calculateExecutionReadiness(planWithCriticalRisk);
    expect(resultCriticalRisk.score).toBe(resultNoRisks.score - 10); // 10 * 1.0 vs 10 * 0.0 = 10 vs 0 (diff 10)
  });
});
