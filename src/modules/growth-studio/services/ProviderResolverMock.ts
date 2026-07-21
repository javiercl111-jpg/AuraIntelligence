import type { IAIProviderAdapter } from './contracts/IAIProviderAdapter';
import type { GenerationPolicy } from '../types';

export class ProviderResolverMock {
  private adapters: Map<string, IAIProviderAdapter>;

  constructor(adapters: IAIProviderAdapter[]) {
    this.adapters = new Map();
    adapters.forEach(a => this.adapters.set(a.providerId, a));
  }

  public resolve(policy: GenerationPolicy): IAIProviderAdapter {
    const availableAdapters = Array.from(this.adapters.values());

    for (const adapter of availableAdapters) {
      // Check allowed providers if restricted
      if (policy.allowedProviders.length > 0 && !policy.allowedProviders.includes(adapter.providerId)) {
        continue;
      }

      // Check blocked models/providers
      if (policy.blockedModels.includes(adapter.providerId)) {
        continue;
      }

      // Check mandatory capabilities
      const hasAllCapabilities = policy.mandatoryCapabilities.every((cap: string) =>
        adapter.capabilities.includes(cap)
      );

      if (hasAllCapabilities) {
        return adapter;
      }
    }

    throw new Error('No available AI provider matches the required generation policy.');
  }
}
