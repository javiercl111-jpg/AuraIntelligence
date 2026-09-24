import type { TalentCanonicalRequestV1 } from "./talentRequestSchemaV1.js";

export interface TalentExecutionInputV1 {
  readonly environment: string;
  readonly authenticatedConsumerId: string;
  readonly auraTenantId: string;
  readonly canonicalRequest: TalentCanonicalRequestV1;
}

export type TalentExecutionOutcomeV1 =
  | Readonly<{
      kind: "EXECUTED";
    }>
  | Readonly<{
      kind: "FAILED";
    }>;

export interface TalentExecutionBoundaryV1 {
  execute(
    input: TalentExecutionInputV1,
  ): Promise<TalentExecutionOutcomeV1>;
}

export class FailClosedTalentExecutionBoundaryV1
  implements TalentExecutionBoundaryV1
{
  async execute(
    _input: TalentExecutionInputV1,
  ): Promise<TalentExecutionOutcomeV1> {
    return Object.freeze({
      kind: "FAILED",
    });
  }
}