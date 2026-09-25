import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryTalentAIProviderObserverV1,
  createTalentAIProviderObservationV1,
} from "./talentAIProviderObservabilityV1.js";

test("records only governed provider observation metadata", () => {
  const observer = new InMemoryTalentAIProviderObserverV1();

  observer.observe({
    outcome: "SUCCESS",
    durationMs: 125,
    providerId: "evaluation-provider",
    modelId: "evaluation-model",
  });

  assert.deepEqual(observer.snapshot(), [
    {
      outcome: "SUCCESS",
      durationMs: 125,
      providerId: "evaluation-provider",
      modelId: "evaluation-model",
    },
  ]);
});

test("supports provider-neutral observations without identifiers", () => {
  assert.deepEqual(
    createTalentAIProviderObservationV1({
      outcome: "TIMEOUT",
      durationMs: 5000,
    }),
    {
      outcome: "TIMEOUT",
      durationMs: 5000,
    },
  );
});

test("rejects invalid duration values", () => {
  assert.throws(
    () =>
      createTalentAIProviderObservationV1({
        outcome: "FAILURE",
        durationMs: -1,
      }),
    /INVALID_PROVIDER_DURATION/,
  );

  assert.throws(
    () =>
      createTalentAIProviderObservationV1({
        outcome: "FAILURE",
        durationMs: Number.NaN,
      }),
    /INVALID_PROVIDER_DURATION/,
  );
});

test("does not expose prompt output context or pii fields", () => {
  const event = createTalentAIProviderObservationV1({
    outcome: "ATTEMPT",
    durationMs: 0,
    providerId: "evaluation-provider",
    modelId: "evaluation-model",
  });

  const keys = Object.keys(event).sort();

  assert.deepEqual(keys, [
    "durationMs",
    "modelId",
    "outcome",
    "providerId",
  ]);
});