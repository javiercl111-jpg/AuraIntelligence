import { defineJsonSecret, projectID } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";

import {
  TALENT_AUTH_SECRET_NAME_V1,
  TALENT_BRIDGE_AUDIENCE_V1,
  TALENT_BRIDGE_CONSUMER_ID_V1,
} from "./talent/talentBridgeConstantsV1.js";
import { FirestoreTalentTenantRegistryV1 } from "./talent/firestoreTalentTenantRegistryV1.js";
import { talentEndpointV1 } from "./talent/talentEndpointV1.js";

const talentCredentialSetV1 = defineJsonSecret<unknown>(
  TALENT_AUTH_SECRET_NAME_V1,
);

const talentAuthenticatedPrincipalV1 = Object.freeze({
  consumerId: TALENT_BRIDGE_CONSUMER_ID_V1,
  audience: TALENT_BRIDGE_AUDIENCE_V1,
});

export const talentIntelligenceEvaluationV1 = onRequest(
  {
    cors: false,
    serviceAccount: "preview-functions-runtime@aura-intel-preview.iam.gserviceaccount.com",
    secrets: [talentCredentialSetV1],
    timeoutSeconds: 15,
  },
  async (request, response) => {
    await talentEndpointV1(request, response, {
      readCredentialSet: () => talentCredentialSetV1.value(),
      readAuthenticatedPrincipal: () => talentAuthenticatedPrincipalV1,
      readProjectId: () => projectID.value(),
      createTenantRegistry: () => new FirestoreTalentTenantRegistryV1(),
    });
  },
);
