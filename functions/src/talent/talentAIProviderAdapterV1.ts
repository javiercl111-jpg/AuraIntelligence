import {
  TalentAIRuntimeErrorV1,
  type TalentAIProviderAdapterV1,
  type TalentAIProviderInputV1,
} from "./talentAIRuntimeContractsV1.js";

/**
 * Encapsulates one injected invocation using the existing F2 provider contract.
 * F2 owns the input snapshot, cancellation, total deadline, output validation and
 * UTF-8 byte ceiling. Raw output stays unknown until F2 validates it.
 */
export function createTalentAIProviderAdapterV1(
  invoke: TalentAIProviderAdapterV1["generate"],
): TalentAIProviderAdapterV1 {
  return Object.freeze({
    async generate(input: TalentAIProviderInputV1, signal: AbortSignal): Promise<unknown> {
      try {
        return await invoke(input, signal);
      } catch {
        // Never inspect, retain or propagate an injected dependency's exception.
        throw new TalentAIRuntimeErrorV1("PROVIDER_UNAVAILABLE");
      }
    },
  });
}
