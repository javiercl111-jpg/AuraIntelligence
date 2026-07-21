export interface CapabilityResult {
  readonly success: boolean;
  readonly artifacts?: readonly string[]; // Artifact IDs generated or modified
  readonly error?: Readonly<{
    code: string;
    message: string;
  }>;
}
