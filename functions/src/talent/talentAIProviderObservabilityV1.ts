export type TalentAIProviderObservationOutcomeV1 =
  | "ATTEMPT"
  | "SUCCESS"
  | "FAILURE"
  | "TIMEOUT";

export interface TalentAIProviderObservationV1 {
  readonly outcome: TalentAIProviderObservationOutcomeV1;
  readonly durationMs: number;
  readonly providerId?: string;
  readonly modelId?: string;
}

export interface TalentAIProviderObserverV1 {
  observe(
    observation: TalentAIProviderObservationV1,
  ): void;
}

function optionalIdentifier(
  value: string | undefined,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    value.length === 0 ||
    value.trim() !== value
  ) {
    throw new Error("INVALID_OBSERVABILITY_IDENTIFIER");
  }

  return value;
}

export function createTalentAIProviderObservationV1(
  observation: TalentAIProviderObservationV1,
): TalentAIProviderObservationV1 {
  if (
    !Number.isFinite(observation.durationMs) ||
    observation.durationMs < 0
  ) {
    throw new Error("INVALID_PROVIDER_DURATION");
  }

  const providerId = optionalIdentifier(
    observation.providerId,
  );
  const modelId = optionalIdentifier(
    observation.modelId,
  );

  const safe: TalentAIProviderObservationV1 = {
    outcome: observation.outcome,
    durationMs: observation.durationMs,
    ...(providerId === undefined ? {} : { providerId }),
    ...(modelId === undefined ? {} : { modelId }),
  };

  return Object.freeze(safe);
}

export class InMemoryTalentAIProviderObserverV1
  implements TalentAIProviderObserverV1 {
  readonly #events: TalentAIProviderObservationV1[] = [];

  observe(
    observation: TalentAIProviderObservationV1,
  ): void {
    this.#events.push(
      createTalentAIProviderObservationV1(observation),
    );
  }

  snapshot(): readonly TalentAIProviderObservationV1[] {
    return Object.freeze(
      this.#events.map((event) =>
        Object.freeze({ ...event }),
      ),
    );
  }
}