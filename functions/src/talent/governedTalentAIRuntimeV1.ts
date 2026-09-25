import { performance } from "node:perf_hooks";
import {
  requireTalentContextScopeV1,
  snapshotTalentContextAuthorityV1,
  validateTalentCompiledContextV1,
  validateTalentContextScopeV1,
} from "./auraTalentContextCompilerV1.js";
import {
  exactTalentAIRecordV1,
  snapshotTalentAIJsonV1,
  TALENT_AI_DEADLINE_MS_V1,
  TALENT_AI_FAILURE_CODES_V1,
  TALENT_AI_GUARANTEES_V1,
  TalentAIRuntimeErrorV1,
  type TalentAIProviderInputV1,
  type TalentAIRuntimeClockV1,
  type TalentAIRuntimeDependenciesV1,
  type TalentAIRuntimeFailureCodeV1,
  type TalentAIRuntimeResultV1,
  type TalentContextAuthorityV1,
} from "./talentAIRuntimeContractsV1.js";
import { failedTalentAIResultV1, validatedTalentAIResultV1, validateTalentAIResultV1 } from "./talentAIResultSchemaV1.js";
import { TALENT_MAX_RAW_BODY_BYTES_V1 } from "./talentBridgeConstantsV1.js";
import { TalentEndpointErrorV1 } from "./talentEndpointErrorsV1.js";
import type { TalentExecutionBoundaryV1, TalentExecutionInputV1, TalentExecutionOutcomeV1 } from "./talentExecutionBoundaryV1.js";
import { enforceTalentPiiGovernanceV1 } from "./talentPiiGovernanceV1.js";
import { validateTalentRequestSchemaV1 } from "./talentRequestSchemaV1.js";

const defaultClock: TalentAIRuntimeClockV1 = Object.freeze({
  now: () => performance.now(),
  schedule: (delayMs: number, callback: () => void) => {
    const timer = setTimeout(callback, delayMs);
    return () => clearTimeout(timer);
  },
});

function failureCode(error: unknown): TalentAIRuntimeFailureCodeV1 {
  if (error instanceof TalentAIRuntimeErrorV1 && TALENT_AI_FAILURE_CODES_V1.includes(error.code)) {
    return error.code;
  }
  if (error instanceof TalentEndpointErrorV1 &&
      (error.code === "PROHIBITED_PII" || error.code === "SCHEMA_VIOLATION")) return error.code;
  return "INTERNAL_FAILURE";
}

function snapshotInput(input: TalentExecutionInputV1): TalentExecutionInputV1 {
  const envelope = exactTalentAIRecordV1(snapshotTalentAIJsonV1(
    input, TALENT_MAX_RAW_BODY_BYTES_V1 + 16_384, "SCHEMA_VIOLATION",
  ), ["environment", "authenticatedConsumerId", "auraTenantId", "canonicalRequest"]);
  // Only the canonical client payload is subject to the certified client PII policy.
  enforceTalentPiiGovernanceV1(envelope.canonicalRequest);
  const canonicalRequest = validateTalentRequestSchemaV1(envelope.canonicalRequest);
  const scope = validateTalentContextScopeV1({
    environment: envelope.environment,
    authenticatedConsumerId: envelope.authenticatedConsumerId,
    hcmCompanyId: canonicalRequest.hcmCompanyId,
    auraTenantId: envelope.auraTenantId,
  });
  return Object.freeze({
    environment: scope.environment,
    authenticatedConsumerId: scope.authenticatedConsumerId,
    auraTenantId: scope.auraTenantId,
    canonicalRequest,
  });
}

export class GovernedTalentAIRuntimeV1 implements TalentExecutionBoundaryV1 {
  private readonly authority: TalentContextAuthorityV1;
  private readonly clock: TalentAIRuntimeClockV1;
  private readonly provider: TalentAIRuntimeDependenciesV1["provider"];
  private readonly contextCompiler: TalentAIRuntimeDependenciesV1["contextCompiler"];

  constructor(dependencies: TalentAIRuntimeDependenciesV1) {
    this.authority = snapshotTalentContextAuthorityV1(dependencies.authority);
    this.clock = dependencies.clock ?? defaultClock;
    this.provider = dependencies.provider;
    this.contextCompiler = dependencies.contextCompiler;
  }

  async execute(input: TalentExecutionInputV1): Promise<TalentExecutionOutcomeV1> {
    const result = await this.evaluate(input);
    return Object.freeze({ kind: result.kind === "ADVISORY_VALIDATED" ? "EXECUTED" : "FAILED" });
  }

  async evaluate(input: TalentExecutionInputV1): Promise<TalentAIRuntimeResultV1> {
    const controller = new AbortController();
    let cancelTimer: (() => void) | undefined;
    let active = true;
    let result: TalentAIRuntimeResultV1;
    try {
      const started = this.clock.now();
      if (!Number.isFinite(started)) throw new TalentAIRuntimeErrorV1("INTERNAL_FAILURE");
      const deadline = started + TALENT_AI_DEADLINE_MS_V1;
      const checkActive = (): void => {
        const now = this.clock.now();
        if (!Number.isFinite(now) || now < started) throw new TalentAIRuntimeErrorV1("INTERNAL_FAILURE");
        if (!active || controller.signal.aborted || now >= deadline) {
          throw new TalentAIRuntimeErrorV1("TIMEOUT");
        }
      };
      const snapshot = snapshotInput(input);
      requireTalentContextScopeV1(validateTalentContextScopeV1({
        environment: snapshot.environment,
        authenticatedConsumerId: snapshot.authenticatedConsumerId,
        hcmCompanyId: snapshot.canonicalRequest.hcmCompanyId,
        auraTenantId: snapshot.auraTenantId,
      }), this.authority.scope);
      checkActive();
      const timeout = new Promise<never>((_resolve, reject) => {
        cancelTimer = this.clock.schedule(Math.max(0, deadline - this.clock.now()), () => {
          active = false;
          reject(new TalentAIRuntimeErrorV1("TIMEOUT"));
          controller.abort();
        });
      });
      const work = async (): Promise<TalentAIRuntimeResultV1> => {
        checkActive();
        let compiled: unknown;
        try {
          compiled = await this.contextCompiler.compile(snapshot, controller.signal);
        } catch (error: unknown) {
          if (error instanceof TalentAIRuntimeErrorV1 || error instanceof TalentEndpointErrorV1) throw error;
          throw new TalentAIRuntimeErrorV1("TOOL_FAILURE");
        }
        checkActive();
        const context = validateTalentCompiledContextV1(compiled, snapshot, this.authority);
        const subject = snapshot.canonicalRequest.subjects[0];
        const projection: TalentAIProviderInputV1 = Object.freeze({
          schemaVersion: "TALENT_AI_PROVIDER_INPUT_V1",
          ...TALENT_AI_GUARANTEES_V1,
          subject: Object.freeze({
            subjectRef: subject.subjectRef,
            hardStops: subject.hardStops,
            evidenceQuality: subject.evidenceQuality,
          }),
          context: Object.freeze({ policyRevision: context.policyRevision, rules: context.rules }),
        });
        checkActive();
        let raw: unknown;
        try {
          raw = await this.provider.generate(projection, controller.signal);
        } catch (error: unknown) {
          if (error instanceof TalentAIRuntimeErrorV1) throw error;
          throw new TalentAIRuntimeErrorV1("PROVIDER_UNAVAILABLE");
        }
        checkActive();
        const advisory = validateTalentAIResultV1(raw, snapshot.canonicalRequest, context);
        checkActive();
        return validatedTalentAIResultV1(advisory);
      };
      result = await Promise.race([timeout, work()]);
    } catch (error: unknown) {
      result = failedTalentAIResultV1(failureCode(error));
    } finally {
      active = false;
      try {
        controller.abort();
        cancelTimer?.();
      } catch {
        result = failedTalentAIResultV1("INTERNAL_FAILURE");
      }
    }
    return result;
  }
}
