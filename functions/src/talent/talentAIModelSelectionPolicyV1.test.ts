import assert from "node:assert/strict";
import test from "node:test";

import {
  GovernedTalentAIModelSelectionPolicyV1,
} from "./talentAIModelSelectionPolicyV1.js";

test("allows only an exact governed provider and model pair", () => {
  const policy = new GovernedTalentAIModelSelectionPolicyV1([
    { providerId: "evaluation-provider", modelId: "evaluation-model" },
  ]);

  assert.deepEqual(
    policy.evaluate({
      providerId: "evaluation-provider",
      modelId: "evaluation-model",
    }),
    {
      allowed: true,
      providerId: "evaluation-provider",
      modelId: "evaluation-model",
    },
  );
});

test("fails closed for an unknown model", () => {
  const policy = new GovernedTalentAIModelSelectionPolicyV1([
    { providerId: "evaluation-provider", modelId: "evaluation-model" },
  ]);

  assert.deepEqual(
    policy.evaluate({
      providerId: "evaluation-provider",
      modelId: "unknown-model",
    }),
    {
      allowed: false,
      reason: "NOT_ALLOWLISTED",
    },
  );
});

test("fails closed for an unknown provider", () => {
  const policy = new GovernedTalentAIModelSelectionPolicyV1([
    { providerId: "evaluation-provider", modelId: "evaluation-model" },
  ]);

  assert.deepEqual(
    policy.evaluate({
      providerId: "unknown-provider",
      modelId: "evaluation-model",
    }),
    {
      allowed: false,
      reason: "NOT_ALLOWLISTED",
    },
  );
});

test("rejects malformed governed identifiers", () => {
  const policy = new GovernedTalentAIModelSelectionPolicyV1([]);

  assert.throws(
    () =>
      policy.evaluate({
        providerId: "",
        modelId: "evaluation-model",
      }),
    /INVALID_PROVIDERID/,
  );

  assert.throws(
    () =>
      policy.evaluate({
        providerId: "evaluation-provider",
        modelId: " evaluation-model",
      }),
    /INVALID_MODELID/,
  );
});