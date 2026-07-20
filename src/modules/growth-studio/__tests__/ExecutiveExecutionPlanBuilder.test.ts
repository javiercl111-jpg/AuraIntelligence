import { describe, it, expect } from 'vitest';
import { ExecutiveExecutionPlanBuilder } from '../services/ExecutiveExecutionPlanBuilder';
import type { GrowthObjective } from '../types/growthObjective';
import type { BrandBrain } from '../types/brandBrain';
import type { CampaignStrategy } from '../types/campaignStrategy';

describe('ExecutiveExecutionPlanBuilder', () => {
  const mockObjective: GrowthObjective = {
    id: 'obj-1',
    tenantId: 't-1',
    companyId: 'c-1',
    createdBy: 'u-1',
    status: 'draft',
    goal: 'Aumentar ventas',
    productOrService: 'SaaS',
    audience: 'B2B',
    region: 'Global',
    horizon: 'short_term',
    expectedResult: '50% más leads',
    constraints: [],
    confidence: 'high',
    schemaVersion: 1,
    createdAt: '',
    updatedAt: ''
  };

  const mockBrandBrain: BrandBrain = {
    id: 'bb-1',
    tenantId: 't-1',
    companyId: 'c-1',
    companyProfile: { 
      companyName: { value: 'Tech', status: 'confirmed', confidence: 'high' }, 
      businessDescription: { value: 'Tech Desc', status: 'confirmed', confidence: 'high' }
    },
    industry: { value: 'Tech', status: 'confirmed', confidence: 'high' },
    products: { value: ['SaaS'], status: 'confirmed', confidence: 'high' },
    valueProposition: { value: 'Mejor software', status: 'confirmed', confidence: 'high' },
    targetAudience: { value: 'Empresas', status: 'confirmed', confidence: 'high' },
    brandTone: { value: 'Profesional', status: 'confirmed', confidence: 'high' },
    differentiators: { value: ['Rápido'], status: 'confirmed', confidence: 'high' },
    communicationStyle: { value: 'Directo', status: 'confirmed', confidence: 'high' },
    businessGoals: { value: ['Crecer'], status: 'confirmed', confidence: 'high' },
    knownFacts: [],
    missingKnowledge: [],
    confidenceScore: 100,
    createdAt: '',
    updatedAt: ''
  };

  const mockStrategy: CampaignStrategy = {
    id: 'strat-1',
    tenantId: 't-1',
    companyId: 'c-1',
    campaignObjective: { value: 'Lead Gen', status: 'confirmed' },
    primaryAudience: { value: 'CTOs', status: 'confirmed' },
    secondaryAudience: { value: 'CEOs', status: 'confirmed' },
    coreMessage: { value: 'Optimiza tu tiempo', status: 'confirmed' },
    valueDrivers: { value: ['Fast'], status: 'confirmed' },
    recommendedChannels: { value: ['LinkedIn'], status: 'confirmed' },
    recommendedContentTypes: { value: ['Post'], status: 'confirmed' },
    callsToAction: { value: ['Demo'], status: 'confirmed' },
    strategyEvidenceScore: 100,
    readinessScore: 100,
    strategyReadinessReason: 'Ready',
    assumptions: [],
    knowledgeGaps: [],
    strategyRisks: [],
    executionConstraints: {},
    createdAt: '',
    updatedAt: ''
  };

  it('builds a ready plan when all inputs are confirmed', () => {
    const plan = ExecutiveExecutionPlanBuilder.build(mockObjective, mockBrandBrain, mockStrategy, 'conv-1');

    expect(plan.isBlocked).toBe(false);
    expect(plan.executionReadiness).toBeGreaterThan(80);
    expect(plan.missingDependencies.length).toBe(0);
    // Acción recomendada no debe ser resolver dependencia bloqueante
    expect(plan.nextRecommendedAction?.title).not.toContain('Confirmar:');
  });

  it('generates a blocking critical dependency if strategy message is missing', () => {
    const incompleteStrategy = { ...mockStrategy, coreMessage: { value: null, status: 'missing' as const } };
    const plan = ExecutiveExecutionPlanBuilder.build(mockObjective, mockBrandBrain, incompleteStrategy, 'conv-1');

    expect(plan.missingDependencies.some(d => d.id === 'dep-strategy-msg')).toBe(true);
    expect(plan.isBlocked).toBe(true);
    expect(plan.nextRecommendedAction?.title).toContain('Mensaje principal de campaña');
  });

  it('correctly maps executionRisks avoiding strategyRisks overlap', () => {
    const incompleteStrategy = { ...mockStrategy, coreMessage: { value: null, status: 'missing' as const } };
    const plan = ExecutiveExecutionPlanBuilder.build(mockObjective, mockBrandBrain, incompleteStrategy, 'conv-1');

    // Debe contener el riesgo de "No existe contenido aprobado"
    expect(plan.executionRisks.some(r => r.id === 'risk-no-content')).toBe(true);
    expect(plan.executionRisks).not.toEqual(mockStrategy.strategyRisks);
  });

  it('generates an action for a missing field', () => {
    const missingAudienceStrategy = { ...mockStrategy, primaryAudience: { value: null, status: 'missing' as const } };
    const plan = ExecutiveExecutionPlanBuilder.build(mockObjective, mockBrandBrain, missingAudienceStrategy, 'conv-1');

    // Debe tener una acción para definir audiencia primaria
    expect(plan.actionQueue.some(a => a.title.includes('Audiencia primaria'))).toBe(true);
    expect(plan.isBlocked).toBe(false); // Audiencia no es bloqueante
  });

  it('generates an action for an inferred field', () => {
    const inferredStrategy = { ...mockStrategy, recommendedChannels: { value: ['LinkedIn'], status: 'inferred' as const } };
    const plan = ExecutiveExecutionPlanBuilder.build(mockObjective, mockBrandBrain, inferredStrategy, 'conv-1');

    // Debería generar acción para validar canales inferidos
    expect(plan.actionQueue.some(a => a.title.includes('Validar Canales recomendados'))).toBe(true);
  });

  it('does not generate channels or actions without evidence', () => {
    const noChannelsStrategy = { ...mockStrategy, recommendedChannels: { value: [], status: 'confirmed' as const } };
    const plan = ExecutiveExecutionPlanBuilder.build(mockObjective, mockBrandBrain, noChannelsStrategy, 'conv-1');
    
    // Al no haber canales, no debe generar acciones de configuración de canales
    expect(plan.actionQueue.some(a => a.title.includes('Configurar canales'))).toBe(false);
  });

  it('assigns states not_started, ready, and blocked properly to phases', () => {
    const plan = ExecutiveExecutionPlanBuilder.build(mockObjective, mockBrandBrain, mockStrategy, 'conv-1');
    
    const preparation = plan.strategicPhases.find(p => p.id === 'preparation');
    const followUp = plan.strategicPhases.find(p => p.id === 'follow_up');

    expect(preparation?.state).toBe('ready'); // Si no hay bloqueos
    expect(followUp?.state).toBe('not_started'); // Fases futuras
  });
});
