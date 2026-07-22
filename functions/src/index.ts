import { createHash } from 'node:crypto';
import { onRequest } from 'firebase-functions/v2/https';
import { createRemoteJWKSet } from 'jose';
import {
  DeterministicExecutiveDiscoveryReasoningProvider,
  ExecutiveDiscoveryCapability,
} from '../../src/core/eis/discovery';
import { loadExecutiveDiscoverySecurityConfig } from './config';
import { createEvaluateExecutiveDiscoveryV1Handler } from './evaluateExecutiveDiscoveryV1';
import { consoleSecurityLogger } from './observability';
import {
  DevelopmentServiceIdentityVerifier,
  JoseOidcTokenVerifier,
  OidcServiceIdentityVerifier,
  ServiceAuthorizationPolicy,
  type SecurityClock,
  type ServiceIdentityVerifier,
} from './security';

const securityClock: SecurityClock = {
  nowEpochSeconds: () => Math.floor(Date.now() / 1_000),
};

const securityConfig = loadExecutiveDiscoverySecurityConfig();

function createServiceIdentityVerifier(): ServiceIdentityVerifier {
  if (securityConfig.allowDevelopmentVerifier) {
    return new DevelopmentServiceIdentityVerifier({
      environment: securityConfig.environment,
      credentials: securityConfig.developmentCredentials,
    });
  }

  if (securityConfig.oidcJwksUri === undefined) {
    throw new Error('OIDC service identity configuration is unavailable.');
  }

  const keyResolver = createRemoteJWKSet(new URL(securityConfig.oidcJwksUri));
  return new OidcServiceIdentityVerifier(
    new JoseOidcTokenVerifier(keyResolver, securityConfig.oidcAlgorithms),
    securityClock,
  );
}

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
  createEvaluateExecutiveDiscoveryV1Handler({
    capability: executiveDiscoveryCapability,
    identityVerifier: createServiceIdentityVerifier(),
    authorizationPolicy: new ServiceAuthorizationPolicy(securityConfig),
    securityConfig,
    securityLogger: consoleSecurityLogger,
    clock: securityClock,
  }),
);
