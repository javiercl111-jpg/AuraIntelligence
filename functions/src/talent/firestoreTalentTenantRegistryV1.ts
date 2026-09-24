import type { Firestore } from "firebase-admin/firestore";

import { getServerFirestoreV1 } from "../firebaseAdmin.js";
import { TALENT_TENANT_REGISTRY_COLLECTION_V1 } from "./talentBridgeConstantsV1.js";
import type {
  TalentTenantAuthorityInputV1,
  TalentTenantAuthoritySnapshotV1,
  TalentTenantMappingCandidateV1,
  TalentTenantRegistryV1,
} from "./talentTenantAuthorityV1.js";

export interface FirestoreTenantQueryV1 {
  where(fieldPath: string, operator: "==", value: string): FirestoreTenantQueryV1;
  limit(value: number): FirestoreTenantQueryV1;
}

export interface FirestoreTenantDocumentV1 {
  readonly id: string;
  data(): unknown;
}

export interface FirestoreTenantQuerySnapshotV1 {
  readonly docs: readonly FirestoreTenantDocumentV1[];
}

export interface FirestoreTenantReadTransactionV1 {
  get(query: FirestoreTenantQueryV1): Promise<FirestoreTenantQuerySnapshotV1>;
}

export interface FirestoreTenantReaderV1 {
  collection(path: string): FirestoreTenantQueryV1;
  runTransaction<Result>(
    operation: (transaction: FirestoreTenantReadTransactionV1) => Promise<Result>,
    options: { readonly readOnly: true },
  ): Promise<Result>;
}

function asReadOnlyReader(firestore: Firestore): FirestoreTenantReaderV1 {
  return firestore as unknown as FirestoreTenantReaderV1;
}

function readField(data: unknown, field: string): unknown {
  if (
    typeof data !== "object" ||
    data === null ||
    Array.isArray(data) ||
    !Object.prototype.hasOwnProperty.call(data, field)
  ) {
    return undefined;
  }
  return Reflect.get(data, field);
}

function toCandidate(
  document: FirestoreTenantDocumentV1,
): TalentTenantMappingCandidateV1 {
  const data = document.data();
  return Object.freeze({
    mappingId: document.id,
    environment: readField(data, "environment"),
    authenticatedConsumerId: readField(data, "authenticatedConsumerId"),
    hcmCompanyId: readField(data, "hcmCompanyId"),
    auraTenantId: readField(data, "auraTenantId"),
    status: readField(data, "status"),
  });
}

function forwardQuery(
  firestore: FirestoreTenantReaderV1,
  input: TalentTenantAuthorityInputV1,
): FirestoreTenantQueryV1 {
  return firestore
    .collection(TALENT_TENANT_REGISTRY_COLLECTION_V1)
    .where("environment", "==", input.environment)
    .where("authenticatedConsumerId", "==", input.authenticatedConsumerId)
    .where("hcmCompanyId", "==", input.hcmCompanyId)
    .where("status", "==", "ACTIVE")
    .limit(2);
}

function reverseQuery(
  firestore: FirestoreTenantReaderV1,
  input: TalentTenantAuthorityInputV1,
  auraTenantId: string,
): FirestoreTenantQueryV1 {
  return firestore
    .collection(TALENT_TENANT_REGISTRY_COLLECTION_V1)
    .where("environment", "==", input.environment)
    .where("authenticatedConsumerId", "==", input.authenticatedConsumerId)
    .where("auraTenantId", "==", auraTenantId)
    .where("status", "==", "ACTIVE")
    .limit(2);
}

export class FirestoreTalentTenantRegistryV1
  implements TalentTenantRegistryV1
{
  constructor(
    private readonly firestore: FirestoreTenantReaderV1 = asReadOnlyReader(
      getServerFirestoreV1(),
    ),
  ) {}

  async readAuthoritySnapshot(
    input: TalentTenantAuthorityInputV1,
  ): Promise<TalentTenantAuthoritySnapshotV1> {
    return this.firestore.runTransaction(async (transaction) => {
      const forwardSnapshot = await transaction.get(
        forwardQuery(this.firestore, input),
      );
      const forward = forwardSnapshot.docs.map(toCandidate);

      if (
        forward.length !== 1 ||
        typeof forward[0].auraTenantId !== "string"
      ) {
        return Object.freeze({ forward, reverse: [] });
      }

      const reverseSnapshot = await transaction.get(
        reverseQuery(this.firestore, input, forward[0].auraTenantId),
      );
      return Object.freeze({
        forward,
        reverse: reverseSnapshot.docs.map(toCandidate),
      });
    }, { readOnly: true });
  }
}
