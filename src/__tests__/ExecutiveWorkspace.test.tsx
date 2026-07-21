import { render, screen, fireEvent } from '@testing-library/react';
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
  GrowthStudioEntry: () => <div data-testid="growth-studio-entry" />
}));

describe('ExecutiveWorkspace INT-01', () => {
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
    
    const greeting = screen.getByText(/Carlos Perez/);
    expect(greeting).toBeInTheDocument();
  });

  it('shows Copilot CTA and hides Crecimiento Ejecutivo when feature flag is OFF', () => {
    vi.mocked(featureFlagService.isFeatureEnabled).mockReturnValue(false);
    render(<ExecutiveWorkspace context={getMockContext()} />);
    
    expect(screen.getByText(/Abrir Copilot/i)).toBeInTheDocument();
    expect(screen.queryByText('Crecimiento Ejecutivo')).not.toBeInTheDocument();
    expect(screen.queryByText('Abrir Growth Studio')).not.toBeInTheDocument();
  });

  it('shows Crecimiento Ejecutivo when feature flag is ON and hides Snapshot', () => {
    vi.mocked(featureFlagService.isFeatureEnabled).mockImplementation((flag) => flag === 'growth_studio.enabled');
    render(<ExecutiveWorkspace context={getMockContext()} />);
    
    expect(screen.getByText('Crecimiento Ejecutivo')).toBeInTheDocument();
    expect(screen.getByText('Abrir Growth Studio')).toBeInTheDocument();
    expect(screen.queryByText('Executive Snapshot')).not.toBeInTheDocument();
  });

  it('navigates to GrowthStudioEntry and can return preserving the session (mounted state)', () => {
    vi.mocked(featureFlagService.isFeatureEnabled).mockReturnValue(true);
    render(<ExecutiveWorkspace context={getMockContext()} />);
    
    // Growth Studio starts hidden via CSS
    expect(screen.getByTestId('growth-studio-entry').parentElement).toHaveStyle('display: none');
    
    // Click Abrir Growth Studio
    const openBtn = screen.getByText('Abrir Growth Studio');
    fireEvent.click(openBtn);
    
    // Growth Studio should be visible now, and home should be hidden
    expect(screen.getByTestId('growth-studio-entry').parentElement).toHaveStyle('display: block');
    
    // Instead of using complex parentElement chains, let's query the wrapper div that has the style
    const homeWrapper = screen.getByText('Asistencia y Conocimiento').closest('div[style]');
    expect(homeWrapper).toHaveStyle('display: none');
    
    // Return to Home
    const backBtn = screen.getByText(/Volver a Aura Intelligence/i);
    fireEvent.click(backBtn);
    
    // Growth Studio should be hidden again, home visible
    expect(screen.getByTestId('growth-studio-entry').parentElement).toHaveStyle('display: none');
    
    const homeWrapper2 = screen.getByText('Asistencia y Conocimiento').closest('div[style]');
    expect(homeWrapper2).toHaveStyle('display: block');
  });

  it('preserves administrative tools in secondary navigation regardless of flag', () => {
    vi.mocked(featureFlagService.isFeatureEnabled).mockReturnValue(false);
    render(<ExecutiveWorkspace context={getMockContext()} />);
    
    expect(screen.getByText('Herramientas Administrativas')).toBeInTheDocument();
    expect(screen.getByText('Assistant Core')).toBeInTheDocument();
    expect(screen.getByTestId('aura-copilot-drafts-panel')).toBeInTheDocument();
  });
});
