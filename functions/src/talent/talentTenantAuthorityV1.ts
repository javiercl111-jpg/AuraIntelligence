import {
  TALENT_BRIDGE_CONSUMER_ID_V1,
  TALENT_PROJECTS_BY_ENVIRONMENT_V1,
  type TalentBridgeEnvironmentV1,
} from "./talentBridgeConstantsV1.js";

export class TalentTenantMismatchErrorV1 extends Error {
  readonly code = "TENANT_MISMATCH" as const;

  constructor() {
    super("TENANT_MISMATCH");
    this.name = "TalentTenantMismatchErrorV1";
  }
}

export interface TalentTenantAuthorityInputV1 {
  readonly environment: TalentBridgeEnvironmentV1;
  readonly authenticatedConsumerId: string;
  readonly hcmCompanyId: string;
}

export interface TalentTenantMappingCandidateV1 {
  readonly mappingId: string;
  readonly environment: unknown;
  readonly authenticatedConsumerId: unknown;
  readonly hcmCompanyId: unknown;
  readonly auraTenantId: unknown;
  readonly status: unknown;
}

export interface TalentTenantAuthoritySnapshotV1 {
  readonly forward: readonly TalentTenantMappingCandidateV1[];
  readonly reverse: readonly TalentTenantMappingCandidateV1[];
}

export interface TalentTenantRegistryV1 {
  readAuthoritySnapshot(
    input: TalentTenantAuthorityInputV1,
  ): Promise<TalentTenantAuthoritySnapshotV1>;
}

function tenantMismatch(): never {
  throw new TalentTenantMismatchErrorV1();
}

function isExactAuthorityIdentifier(value: string): boolean {
  return (
    value.length > 0 &&
    value.trim() === value &&
    !value.includes("*") &&
    value.toLowerCase() !== "default" &&
    !/[\u0000-\u001f\u007f]/u.test(value)
  );
}

function isValidAuthorityInput(input: TalentTenantAuthorityInputV1): boolean {
  return (
    (input.environment === "preview" || input.environment === "staging") &&
    input.authenticatedConsumerId === TALENT_BRIDGE_CONSUMER_ID_V1 &&
    isExactAuthorityIdentifier(input.hcmCompanyId)
  );
}

function isExactMapping(
  candidate: unknown,
  input: TalentTenantAuthorityInputV1,
): candidate is TalentTenantMappingCandidateV1 & { readonly auraTenantId: string } {
  if (typeof candidate !== "object" || candidate === null) {
    return false;
  }

  const mapping = candidate as Record<string, unknown>;
  return (
    typeof mapping.mappingId === "string" &&
    mapping.mappingId.length > 0 &&
    mapping.status === "ACTIVE" &&
    mapping.environment === input.environment &&
    mapping.authenticatedConsumerId === input.authenticatedConsumerId &&
    mapping.hcmCompanyId === input.hcmCompanyId &&
    typeof mapping.auraTenantId === "string" &&
    isExactAuthorityIdentifier(mapping.auraTenantId)
  );
}

export function resolveTalentBridgeEnvironmentV1(
  projectId: string | undefined,
): TalentBridgeEnvironmentV1 {
  if (projectId === TALENT_PROJECTS_BY_ENVIRONMENT_V1.preview) {
    return "preview";
  }
  if (projectId === TALENT_PROJECTS_BY_ENVIRONMENT_V1.staging) {
    return "staging";
  }
  return tenantMismatch();
}

export function resolveTalentTenantFromSnapshotV1(
  input: TalentTenantAuthorityInputV1,
  snapshot: TalentTenantAuthoritySnapshotV1,
): string {
  if (
    !isValidAuthorityInput(input) ||
    !Array.isArray(snapshot.forward) ||
    !Array.isArray(snapshot.reverse) ||
    snapshot.forward.length !== 1 ||
    snapshot.reverse.length !== 1
  ) {
    return tenantMismatch();
  }

  const forward = snapshot.forward[0];
  if (!isExactMapping(forward, input)) {
    return tenantMismatch();
  }

  const reverse = snapshot.reverse[0];
  if (
    !isExactMapping(reverse, input) ||
    reverse.auraTenantId !== forward.auraTenantId ||
    reverse.mappingId !== forward.mappingId
  ) {
    return tenantMismatch();
  }

  return forward.auraTenantId;
}

export async function resolveTalentTenantAuthorityV1(
  input: TalentTenantAuthorityInputV1,
  registry: TalentTenantRegistryV1,
): Promise<string> {
  if (!isValidAuthorityInput(input)) {
    return tenantMismatch();
  }

  const snapshot = await registry.readAuthoritySnapshot(input);
  return resolveTalentTenantFromSnapshotV1(input, snapshot);
}
