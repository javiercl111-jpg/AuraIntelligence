import { throwTalentEndpointErrorV1 } from "./talentEndpointErrorsV1.js";

export const TALENT_MAX_CONTAINER_DEPTH_V1 = 8;
export const TALENT_MAX_VISITED_CONTAINERS_V1 = 2_048;

const forbiddenKeys = [
  "name", "fullName", "firstName", "lastName", "givenName", "surname",
  "preferredName", "email", "emailAddress", "phone", "phoneNumber",
  "mobile", "telephone", "whatsapp", "address", "streetAddress",
  "postalCode", "zipCode", "location", "geolocation", "dob",
  "dateOfBirth", "birthDate", "birthday", "age", "governmentId",
  "nationalId", "ssn", "taxId", "rfc", "curp", "nss", "passport",
  "visa", "drivingLicense", "employeeId", "employeeNumber", "workerId",
  "personId", "userId", "uid", "authUid", "candidateId", "applicantId",
  "actorId", "managerId", "profileId", "id", "documentId", "recordId",
  "attachmentId", "fileId", "fileUrl", "fileName", "resume", "resumeUrl",
  "cv", "curriculumVitae", "attachment", "rawAttachment", "notes",
  "comments", "description", "summary", "narrative", "text", "freeText",
  "explainability", "insights", "recommendedActions", "prompt",
  "systemPrompt", "providerPrompt", "providerOutput", "modelOutput",
  "completion", "chainOfThought", "reasoning", "rationale", "metadata",
  "attributes", "customFields", "extensions", "extra", "context",
  "tenantId", "auraTenantId", "consumerId", "audience", "actor",
  "companyId",
] as const;

export function normalizeTalentGovernanceKeyV1(key: string): string {
  return key.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]/gu, "");
}

const normalizedForbiddenKeys = new Set(
  forbiddenKeys.map(normalizeTalentGovernanceKeyV1),
);

function isContainer(value: unknown): value is Record<string, unknown> | unknown[] {
  return typeof value === "object" && value !== null;
}

export function enforceTalentPiiGovernanceV1(root: unknown): void {
  if (!isContainer(root) || Array.isArray(root)) {
    throwTalentEndpointErrorV1("SCHEMA_VIOLATION");
  }

  const pending: Array<{ readonly value: Record<string, unknown> | unknown[]; readonly depth: number }> = [
    { value: root, depth: 1 },
  ];
  let visitedContainers = 0;

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) break;
    visitedContainers += 1;
    if (
      current.depth > TALENT_MAX_CONTAINER_DEPTH_V1 ||
      visitedContainers > TALENT_MAX_VISITED_CONTAINERS_V1
    ) {
      throwTalentEndpointErrorV1("SCHEMA_VIOLATION");
    }

    if (Array.isArray(current.value)) {
      for (const child of current.value) {
        if (isContainer(child)) {
          pending.push({ value: child, depth: current.depth + 1 });
        }
      }
      continue;
    }

    for (const key of Object.keys(current.value)) {
      if (normalizedForbiddenKeys.has(normalizeTalentGovernanceKeyV1(key))) {
        throwTalentEndpointErrorV1("PROHIBITED_PII");
      }
      const child = current.value[key];
      if (isContainer(child)) {
        pending.push({ value: child, depth: current.depth + 1 });
      }
    }
  }
}
