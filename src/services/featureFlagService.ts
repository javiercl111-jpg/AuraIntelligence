// ─────────────────────────────────────────────────────────────
// Aura Intelligence — Feature Flag Service (Minimal)
// ─────────────────────────────────────────────────────────────

/**
 * Known feature flags across Aura Intelligence.
 */
export type FeatureFlagKey = 'growth_studio.enabled';

/**
 * Feature flag defaults. Every flag MUST be false by default.
 */
const FEATURE_FLAG_DEFAULTS: Record<FeatureFlagKey, boolean> = {
  'growth_studio.enabled': false,
};

/**
 * Map of environment variable names to feature flag keys.
 * Only VITE_-prefixed variables are accessible in Vite.
 */
const ENV_FLAG_MAP: Record<string, FeatureFlagKey> = {
  VITE_FEATURE_GROWTH_STUDIO: 'growth_studio.enabled',
};

/**
 * Reads a feature flag value.
 *
 * Resolution order:
 * 1. Check for VITE_ environment variable override (dev only).
 * 2. Fall back to default (always false).
 *
 * Security:
 * - No localStorage is consulted.
 * - No Firestore or Remote Config is used.
 * - Env vars are only accessible at build time in Vite.
 * - If the env var does not exist, the flag stays OFF.
 */
export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  // Check env overrides
  for (const [envVar, flagKey] of Object.entries(ENV_FLAG_MAP)) {
    if (flagKey === flag) {
      const envValue = import.meta.env[envVar];
      if (envValue === 'true') {
        return true;
      }
    }
  }

  return FEATURE_FLAG_DEFAULTS[flag];
}

/**
 * Returns all feature flags with their resolved values.
 * Useful for debugging/logging.
 */
export function getAllFeatureFlags(): Record<FeatureFlagKey, boolean> {
  const flags = { ...FEATURE_FLAG_DEFAULTS };

  for (const key of Object.keys(flags) as FeatureFlagKey[]) {
    flags[key] = isFeatureEnabled(key);
  }

  return flags;
}

export default isFeatureEnabled;
