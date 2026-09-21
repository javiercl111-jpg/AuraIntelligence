import { strict as assert } from "node:assert";
import { test } from "node:test";

import { TalentEndpointErrorV1 } from "./talentEndpointErrorsV1.js";
import {
  enforceTalentPiiGovernanceV1,
  normalizeTalentGovernanceKeyV1,
} from "./talentPiiGovernanceV1.js";

function assertGovernanceError(
  code: TalentEndpointErrorV1["code"],
  value: unknown,
): void {
  assert.throws(() => enforceTalentPiiGovernanceV1(value), (error: unknown) => (
    error instanceof TalentEndpointErrorV1 && error.code === code
  ));
}

const forbiddenGroups = [
  ["name", "fullName", "firstName", "lastName", "givenName", "surname", "preferredName"],
  ["email", "emailAddress", "phone", "phoneNumber", "mobile", "telephone", "whatsapp"],
  ["address", "streetAddress", "postalCode", "zipCode", "location", "geolocation"],
  ["dob", "dateOfBirth", "birthDate", "birthday", "age"],
  ["governmentId", "nationalId", "ssn", "taxId", "rfc", "curp", "nss", "passport", "visa", "drivingLicense"],
  ["employeeId", "employeeNumber", "workerId", "personId", "userId", "uid", "authUid", "candidateId", "applicantId", "actorId", "managerId", "profileId"],
  ["id", "documentId", "recordId", "attachmentId", "fileId", "fileUrl", "fileName"],
  ["resume", "resumeUrl", "cv", "curriculumVitae", "attachment", "rawAttachment"],
  ["notes", "comments", "description", "summary", "narrative", "text", "freeText", "explainability", "insights", "recommendedActions"],
  ["prompt", "systemPrompt", "providerPrompt", "providerOutput", "modelOutput", "completion", "chainOfThought", "reasoning", "rationale"],
  ["metadata", "attributes", "customFields", "extensions", "extra", "context"],
  ["tenantId", "auraTenantId", "consumerId", "audience", "actor", "companyId"],
] as const;

test("rejects every explicit forbidden key group at root and below arrays", () => {
  for (const group of forbiddenGroups) {
    for (const key of group) {
      assertGovernanceError("PROHIBITED_PII", { [key]: "rejected-value" });
      assertGovernanceError("PROHIBITED_PII", {
        allowed: [{ nested: { [key]: "rejected-value" } }],
      });
    }
  }
});

test("rejects case, separator, and NFKC-obfuscated aliases", () => {
  for (const key of [
    "E_M-A.I L",
    "Employee---ID",
    "PROVIDER_output",
    "ＭＥＴＡＤＡＴＡ",
    "Date.Of.Birth",
    "aura tenant id",
  ]) {
    assertGovernanceError("PROHIBITED_PII", { [key]: "rejected-value" });
  }
  assert.equal(normalizeTalentGovernanceKeyV1("Ｅ-mail"), "email");
});

test("scans keys rather than controlled values and permits exact root hcmCompanyId", () => {
  assert.doesNotThrow(() => enforceTalentPiiGovernanceV1({
    hcmCompanyId: "company_123",
    protocol: "email",
    values: ["name", "metadata", "employeeId"],
  }));
});

test("enforces at most eight container levels iteratively", () => {
  const root: Record<string, unknown> = {};
  let cursor = root;
  for (let depth = 2; depth <= 8; depth += 1) {
    const next: Record<string, unknown> = {};
    cursor.allowed = next;
    cursor = next;
  }
  assert.doesNotThrow(() => enforceTalentPiiGovernanceV1(root));
  cursor.allowed = {};
  assertGovernanceError("SCHEMA_VIOLATION", root);
});

test("enforces at most 2048 visited object and array nodes", () => {
  const accepted = { items: Array.from({ length: 2_046 }, () => ({})) };
  assert.doesNotThrow(() => enforceTalentPiiGovernanceV1(accepted));
  accepted.items.push({});
  assertGovernanceError("SCHEMA_VIOLATION", accepted);
});
