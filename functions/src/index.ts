import { createHash } from 'node:crypto';
import { onRequest } from 'firebase-functions/v2/https';
import {
  DeterministicExecutiveDiscoveryReasoningProvider,
  ExecutiveDiscoveryCapability,
} from '../../src/core/eis/discovery';
import { createEvaluateExecutiveDiscoveryV1Handler } from './evaluateExecutiveDiscoveryV1';

const executiveDiscoveryCapability = new ExecutiveDiscoveryCapability({
  clock: {
    now: () => new Date().toISOString(),
  },
  idFactory: {
    createId: (scope, seed) => {
      const digest = createHash('sha256')
        .update(`${scope}\u0000${seed}`)
        .digest('hex')
        .slice(0, 32);
      return `${scope}-${digest}`;
    },
  },
  reasoningProvider: new DeterministicExecutiveDiscoveryReasoningProvider(),
});

export const evaluateExecutiveDiscoveryV1 = onRequest(
  createEvaluateExecutiveDiscoveryV1Handler(executiveDiscoveryCapability),
);
