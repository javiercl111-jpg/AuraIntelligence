export interface TalentAIModelCandidateV1 {
  readonly providerId: string;
  readonly modelId: string;
}

export interface TalentAIModelSelectionRequestV1 {
  readonly providerId: string;
  readonly modelId: string;
}

export type TalentAIModelSelectionDecisionV1 =
  | Readonly<{
      allowed: true;
      providerId: string;
      modelId: string;
    }>
  | Readonly<{
      allowed: false;
      reason: "NOT_ALLOWLISTED";
    }>;

function candidateKey(
  candidate: TalentAIModelCandidateV1,
): string {
  return `${candidate.providerId}\u0000${candidate.modelId}`;
}

function requireIdentifier(
  value: string,
  field: "providerId" | "modelId",
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.trim() !== value
  ) {
    throw new Error(`INVALID_${field.toUpperCase()}`);
  }

  return value;
}

export class GovernedTalentAIModelSelectionPolicyV1 {
  readonly #allowed: ReadonlySet<string>;

  constructor(
    candidates: readonly TalentAIModelCandidateV1[],
  ) {
    const allowed = new Set<string>();

    for (const candidate of candidates) {
      const providerId = requireIdentifier(
        candidate.providerId,
        "providerId",
      );
      const modelId = requireIdentifier(
        candidate.modelId,
        "modelId",
      );

      allowed.add(
        candidateKey({ providerId, modelId }),
      );
    }

    this.#allowed = allowed;
  }

  evaluate(
    request: TalentAIModelSelectionRequestV1,
  ): TalentAIModelSelectionDecisionV1 {
    const providerId = requireIdentifier(
      request.providerId,
      "providerId",
    );
    const modelId = requireIdentifier(
      request.modelId,
      "modelId",
    );

    if (
      !this.#allowed.has(
        candidateKey({ providerId, modelId }),
      )
    ) {
      return Object.freeze({
        allowed: false,
        reason: "NOT_ALLOWLISTED",
      });
    }

    return Object.freeze({
      allowed: true,
      providerId,
      modelId,
    });
  }
}