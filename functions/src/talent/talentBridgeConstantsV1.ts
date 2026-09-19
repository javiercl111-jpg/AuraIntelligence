export const TALENT_BRIDGE_PROTOCOL_V1 = "HCM_AURA_TALENT_BRIDGE_V1";

export const TALENT_BRIDGE_CONSUMER_ID_V1 =
  "aura-hcm-talent-bridge-v1";

export const TALENT_BRIDGE_AUDIENCE_V1 =
  "aura-intelligence://HCM_AURA_TALENT_BRIDGE_V1";

export const TALENT_AUTH_SECRET_NAME_V1 =
  "HCM_AURA_TALENT_BRIDGE_V1_CREDENTIAL_SET";

export const TALENT_TENANT_REGISTRY_COLLECTION_V1 =
  "hcmAuraTalentTenantMappingsV1";

export const TALENT_PROJECTS_BY_ENVIRONMENT_V1 = {
  preview: "aura-intel-preview",
  staging: "aura-intel-staging",
  production: null,
} as const;

export type TalentBridgeEnvironmentV1 = "preview" | "staging";
