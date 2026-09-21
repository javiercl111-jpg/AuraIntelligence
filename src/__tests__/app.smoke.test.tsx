// ─────────────────────────────────────────────────────────────
// Aura Intelligence — App.tsx Integration Smoke Tests
// ─────────────────────────────────────────────────────────────
//
// These tests verify that:
// 1. App renders without exception (with mocked Firebase).
// 2. GrowthStudioEntry does NOT appear when the flag is OFF.
// 3. GrowthStudioEntry DOES appear when the flag is ON.
//

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// ── Mock pdfjs-dist (preexisting dep, not available in jsdom) ──
vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
  version: '0.0.0-test',
  GlobalWorkerOptions: { workerSrc: '' },
}));

// ── Mock Firebase Auth ─────────────────────────────────────
// We mock the entire firebase module to avoid real Firebase
// connections during tests.
vi.mock('../firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth, callback: (user: null) => void) => {
    // Simulate unauthenticated state
    callback(null);
    return vi.fn(); // unsubscribe
  }),
  signOut: vi.fn(),
}));

// ── Mock Knowledge Seed Service ────────────────────────────
vi.mock('../services/auraKnowledgeAdminService', () => ({
  seedDefaultArticles: vi.fn().mockResolvedValue(undefined),
}));

// ── Feature Flag Mock ──────────────────────────────────────
// We use a mutable reference so each test can control the flag.
const mockFlagValue = { current: false };

vi.mock('../services/featureFlagService', () => ({
  isFeatureEnabled: (flag: string) => {
    if (flag === 'growth_studio.enabled') {
      return mockFlagValue.current;
    }
    return false;
  },
  default: (flag: string) => {
    if (flag === 'growth_studio.enabled') {
      return mockFlagValue.current;
    }
    return false;
  },
}));

// AGFC01_01A_GROWTH_APP_SMOKE_FIXTURE
// This file validates the Growth application surface explicitly.
// Product-domain authority itself is covered by productSurface tests.
vi.mock('../productSurface', () => ({
  getDevelopmentProductSurface: () => 'growth',
}));

// App smoke must not depend on a live Firestore company lookup.
// Dedicated connector tests own that integration contract.
vi.mock('../services/auraHCMConnectorService', () => ({
  buildAuraHCMConnectorContext: vi.fn(async () => ({
    employee: {
      companyId: 'company-aura',
      displayName: 'Growth Test User',
    },
    profile: null,
    permissions: {},
    company: {
      companyId: 'company-aura',
      name: 'Aura Nexus',
      aiEnabled: true,
      modulesEnabled: [],
      features: {},
    },
  })),
}));
describe('App — Integration Smoke Tests', () => {
  beforeEach(() => {
    mockFlagValue.current = false;
  });

  it('renders the login screen without exception (unauthenticated)', async () => {
    const { default: App } = await import('../App');
    expect(() => render(<App />)).not.toThrow();
  });

  it('does NOT render GrowthStudioEntry when feature flag is OFF', async () => {
    mockFlagValue.current = false;
    const { default: App } = await import('../App');
    render(<App />);

    // Wait for auth state to settle
    await waitFor(() => {
      // The app should render (login or main), but Growth Studio should not appear
      expect(screen.queryByText('Aura Growth Studio™')).not.toBeInTheDocument();
    });
  });

  it('renders GrowthStudioEntry when feature flag is ON and user is authenticated', async () => {
    mockFlagValue.current = true;

    // Override the auth mock to simulate authenticated state
    const firebaseAuth = await import('firebase/auth');
    vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation(
      (_auth, callback) => {
        // Simulate authenticated user
        (callback as (user: unknown) => void)({
          uid: 'test-user',
          email: 'test@aura.demo',
          displayName: 'Test User',
        });
        return vi.fn(); // unsubscribe
      },
    );

    // Need to re-import App to pick up the new mock
    vi.resetModules();

    // Re-setup the mocks after resetModules
    vi.doMock('../firebase', () => ({
      auth: {
        currentUser: {
          uid: 'test-user',
          email: 'test@aura.demo',
          displayName: 'Test User',
        },
      },
    }));

    vi.doMock('firebase/auth', () => ({
      onAuthStateChanged: vi.fn((_auth, callback: (user: unknown) => void) => {
        callback({
          uid: 'test-user',
          email: 'test@aura.demo',
          displayName: 'Test User',
        });
        return vi.fn();
      }),
      signOut: vi.fn(),
    }));

    vi.doMock('../services/auraKnowledgeAdminService', () => ({
      seedDefaultArticles: vi.fn().mockResolvedValue(undefined),
    }));

    vi.doMock('../services/featureFlagService', () => ({
      isFeatureEnabled: (flag: string) => {
        if (flag === 'growth_studio.enabled') return true;
        return false;
      },
      default: (flag: string) => {
        if (flag === 'growth_studio.enabled') return true;
        return false;
      },
    }));

    const { default: App } = await import('../App');
    render(<App />);

    await waitFor(() => {
      expect(
        document.querySelector('#growth-studio-entry'),
      ).toBeInTheDocument();
    });
  });
});
