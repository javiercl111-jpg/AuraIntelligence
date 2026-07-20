// ─────────────────────────────────────────────────────────────
// Aura Growth Studio™ — Smoke Tests (Module Level)
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';

// Mock import.meta.env before importing the service
vi.stubEnv('VITE_FEATURE_GROWTH_STUDIO', '');

describe('Growth Studio — Module Smoke Tests', () => {
  // ── Feature Flag ─────────────────────────────────────────
  describe('Feature Flag', () => {
    it('growth_studio.enabled is OFF by default', async () => {
      // Reset module to pick up the stubbed env
      vi.resetModules();
      vi.stubEnv('VITE_FEATURE_GROWTH_STUDIO', '');

      const { isFeatureEnabled } = await import(
        '../../../services/featureFlagService'
      );

      expect(isFeatureEnabled('growth_studio.enabled')).toBe(false);
    });

    it('growth_studio.enabled can be activated via VITE_FEATURE_GROWTH_STUDIO=true', async () => {
      vi.resetModules();
      vi.stubEnv('VITE_FEATURE_GROWTH_STUDIO', 'true');

      const { isFeatureEnabled } = await import(
        '../../../services/featureFlagService'
      );

      expect(isFeatureEnabled('growth_studio.enabled')).toBe(true);
    });

    it('growth_studio.enabled stays OFF when env var is anything other than "true"', async () => {
      vi.resetModules();
      vi.stubEnv('VITE_FEATURE_GROWTH_STUDIO', 'yes');

      const { isFeatureEnabled } = await import(
        '../../../services/featureFlagService'
      );

      expect(isFeatureEnabled('growth_studio.enabled')).toBe(false);
    });
  });

  // ── Module Exports ───────────────────────────────────────
  describe('Module Exports', () => {
    it('exports GrowthStudioEntry component', async () => {
      const mod = await import('../index');
      expect(mod.GrowthStudioEntry).toBeDefined();
      expect(typeof mod.GrowthStudioEntry).toBe('function');
    });

    it('exports GrowthStudioModuleDefinition', async () => {
      const mod = await import('../index');
      expect(mod.GrowthStudioModuleDefinition).toBeDefined();
    });

    it('exports GROWTH_STUDIO_CAPABILITIES', async () => {
      const mod = await import('../index');
      expect(mod.GROWTH_STUDIO_CAPABILITIES).toBeDefined();
      expect(Array.isArray(mod.GROWTH_STUDIO_CAPABILITIES)).toBe(true);
    });

    it('exports GROWTH_COLLECTIONS', async () => {
      const mod = await import('../index');
      expect(mod.GROWTH_COLLECTIONS).toBeDefined();
    });
  });

  // ── Module Definition Contract ───────────────────────────
  describe('GrowthStudioModuleDefinition Contract', () => {
    it('has the required fields with correct values', async () => {
      const { GrowthStudioModuleDefinition } = await import(
        '../config/growthStudioModule'
      );

      expect(GrowthStudioModuleDefinition.id).toBe('growth_studio');
      expect(GrowthStudioModuleDefinition.name).toBe('Aura Growth Studio');
      expect(GrowthStudioModuleDefinition.productName).toBe('Aura Growth Studio™');
      expect(GrowthStudioModuleDefinition.subtitle).toBe('AI Growth Operating System');
      expect(GrowthStudioModuleDefinition.status).toBe('foundation');
      expect(GrowthStudioModuleDefinition.featureFlag).toBe('growth_studio.enabled');
      expect(GrowthStudioModuleDefinition.schemaVersion).toBeGreaterThanOrEqual(1);
      expect(GrowthStudioModuleDefinition.version).toBeDefined();
    });

    it('lists all 7 capabilities', async () => {
      const { GrowthStudioModuleDefinition } = await import(
        '../config/growthStudioModule'
      );

      expect(GrowthStudioModuleDefinition.capabilities).toHaveLength(7);
      expect(GrowthStudioModuleDefinition.capabilities).toContain('growth_studio.access');
      expect(GrowthStudioModuleDefinition.capabilities).toContain('growth_studio.content.publish');
    });
  });

  // ── Collections Constants ────────────────────────────────
  describe('GROWTH_COLLECTIONS', () => {
    it('defines all 6 collection names', async () => {
      const { GROWTH_COLLECTIONS } = await import(
        '../config/growthStudioCollections'
      );

      expect(GROWTH_COLLECTIONS.CONVERSATIONS).toBe('growth_conversations');
      expect(GROWTH_COLLECTIONS.OBJECTIVES).toBe('growth_objectives');
      expect(GROWTH_COLLECTIONS.CAMPAIGNS).toBe('growth_campaigns');
      expect(GROWTH_COLLECTIONS.BRAND_BRAIN_PROFILES).toBe('brand_brain_profiles');
      expect(GROWTH_COLLECTIONS.APPROVALS).toBe('growth_approvals');
      expect(GROWTH_COLLECTIONS.AUDIT_LOG).toBe('growth_audit_log');
    });
  });

  // ── Capabilities Registry ───────────────────────────────
  describe('GROWTH_STUDIO_CAPABILITIES', () => {
    it('has 7 capabilities with key, name, and description', async () => {
      const { GROWTH_STUDIO_CAPABILITIES } = await import(
        '../config/growthStudioCapabilities'
      );

      expect(GROWTH_STUDIO_CAPABILITIES).toHaveLength(7);

      for (const cap of GROWTH_STUDIO_CAPABILITIES) {
        expect(cap.key).toBeTruthy();
        expect(cap.name).toBeTruthy();
        expect(cap.description).toBeTruthy();
      }
    });
  });
});
