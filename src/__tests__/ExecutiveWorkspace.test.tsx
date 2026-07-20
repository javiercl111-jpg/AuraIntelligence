
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExecutiveWorkspace from '../components/ExecutiveWorkspace';
import * as featureFlagService from '../services/featureFlagService';
import type { AuraIntelligenceContext } from '../types/auraIntelligence';

vi.mock('../services/featureFlagService', () => ({
  isFeatureEnabled: vi.fn(),
}));

// Mock inner components to isolate the test of the ExecutiveWorkspace
vi.mock('../components/AuraCopilotDraftsPanel', () => ({
  default: () => <div data-testid="aura-copilot-drafts-panel" />
}));
vi.mock('../pages/KnowledgeCenterPage', () => ({
  default: () => <div data-testid="knowledge-center-page" />
}));
vi.mock('../pages/ConversationsAuditPage', () => ({
  default: () => <div data-testid="conversations-audit-page" />
}));
vi.mock('../pages/AuraIntelligenceConsolePage', () => ({
  default: () => <div data-testid="aura-intelligence-console-page" />
}));
vi.mock('../modules/growth-studio', () => ({
  ExecutiveConversationPage: () => <div data-testid="executive-conversation-page" />
}));

describe('ExecutiveWorkspace', () => {
  const getMockContext = (overrides: Partial<AuraIntelligenceContext> = {}): AuraIntelligenceContext => ({
    tenantId: 't1',
    companyId: 'c1',
    userId: 'u1',
    userEmail: 'test@example.com',
    userName: 'John Doe',
    role: 'ADMIN',
    profileId: 'p1',
    permissions: [],
    system: 'aura_hcm',
    module: 'mod',
    route: '/',
    language: 'es',
    ...overrides
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders executive greeting with displayName', () => {
    vi.mocked(featureFlagService.isFeatureEnabled).mockReturnValue(false);
    render(<ExecutiveWorkspace context={getMockContext({ userName: 'Carlos Perez' })} />);
    
    // Debería incluir Carlos Perez
    const greeting = screen.getByText(/Carlos Perez/);
    expect(greeting).toBeInTheDocument();
    expect(greeting.textContent).toContain('Aura ha preparado tu espacio de trabajo.');
  });

  it('does not expose email, UID or technical role in greeting if displayName is missing or invalid', () => {
    vi.mocked(featureFlagService.isFeatureEnabled).mockReturnValue(false);
    
    // Caso email
    const { unmount } = render(<ExecutiveWorkspace context={getMockContext({ userName: 'admin@aura.com' })} />);
    expect(screen.queryByText(/admin@aura.com/)).not.toBeInTheDocument();
    unmount();

    // Caso fallback "Administrador Aura"
    render(<ExecutiveWorkspace context={getMockContext({ userName: 'Administrador Aura' })} />);
    expect(screen.queryByText(/Administrador Aura/)).not.toBeInTheDocument();
  });

  it('shows Copilot CTA and hides Growth Studio elements when feature flag is OFF', () => {
    vi.mocked(featureFlagService.isFeatureEnabled).mockReturnValue(false);
    render(<ExecutiveWorkspace context={getMockContext()} />);
    
    // Boton de Abrir Copilot debe existir
    expect(screen.getByText(/Abrir Copilot/i)).toBeInTheDocument();
    
    // Snapshots no deben existir
    expect(screen.queryByText('Executive Snapshot')).not.toBeInTheDocument();
    expect(screen.queryByText('Growth Objective')).not.toBeInTheDocument();
    expect(screen.queryByText('Brand Brain')).not.toBeInTheDocument();
    expect(screen.queryByText('Campaign Strategy')).not.toBeInTheDocument();
    
    // Recomendaciones Growth no deben existir
    expect(screen.queryByText('Recomendaciones Estratégicas')).not.toBeInTheDocument();
    
    // Acceso a Growth Studio no debe existir
    expect(screen.queryByText('Iniciar conversación con Aura')).not.toBeInTheDocument();
  });

  it('shows Growth Studio elements, Snapshots and Recommendations when feature flag is ON', () => {
    vi.mocked(featureFlagService.isFeatureEnabled).mockImplementation((flag) => flag === 'growth_studio.enabled');
    render(<ExecutiveWorkspace context={getMockContext()} />);
    
    // Botón principal de Growth Studio
    expect(screen.getByText(/Iniciar conversación con Aura/i)).toBeInTheDocument();
    
    // Snapshots deben existir y estar en "No iniciado" sin inventar métricas
    expect(screen.getByText('Executive Snapshot')).toBeInTheDocument();
    
    const notStartedElements = screen.getAllByText('No iniciado');
    expect(notStartedElements).toHaveLength(3); // Growth Objective, Brand Brain, Campaign Strategy
    
    // No debe haber porcentajes (0%) u otras métricas falsas
    expect(screen.queryByText('0%')).not.toBeInTheDocument();

    // Recomendaciones deben estar basadas en estado (al estar No Iniciado -> Definir objetivo)
    expect(screen.getByText('Recomendaciones Estratégicas')).toBeInTheDocument();
    expect(screen.getByText('Definir objetivo de crecimiento')).toBeInTheDocument();
  });

  it('preserves administrative tools in secondary navigation regardless of flag', () => {
    vi.mocked(featureFlagService.isFeatureEnabled).mockReturnValue(false);
    render(<ExecutiveWorkspace context={getMockContext()} />);
    
    expect(screen.getByText('Herramientas Administrativas')).toBeInTheDocument();
    expect(screen.getByText('Assistant Core')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Center')).toBeInTheDocument();
    expect(screen.getByText('Boundary Guard')).toBeInTheDocument();
    expect(screen.getByText('Audit Log')).toBeInTheDocument();
    
    expect(screen.getByTestId('aura-copilot-drafts-panel')).toBeInTheDocument();
    expect(screen.getByTestId('aura-intelligence-console-page')).toBeInTheDocument();
    expect(screen.getByTestId('conversations-audit-page')).toBeInTheDocument();
    expect(screen.getByTestId('knowledge-center-page')).toBeInTheDocument();
  });
});
