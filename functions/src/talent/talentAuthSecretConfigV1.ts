export const MAX_TALENT_BEARER_TOKEN_BYTES_V1 = 4096;

export interface TalentAuthSecretConfigV1 {
  readonly primary: string;
  readonly secondary?: string;
}

export class TalentAuthSecretConfigurationErrorV1 extends Error {
  constructor() {
    super("INTERNAL_FAILURE");
    this.name = "TalentAuthSecretConfigurationErrorV1";
  }
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isValidOpaqueBearerCredentialV1(value: string): boolean {
  if (
    value.length === 0 ||
    Buffer.byteLength(value, "utf8") > MAX_TALENT_BEARER_TOKEN_BYTES_V1 ||
    value.includes(",") ||
    /\s/u.test(value)
  ) {
    return false;
  }

  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f)) {
      return false;
    }
  }

  return true;
}

export function parseTalentAuthSecretConfigV1(
  value: unknown,
): TalentAuthSecretConfigV1 {
  if (!isJsonObject(value)) {
    throw new TalentAuthSecretConfigurationErrorV1();
  }

  const keys = Object.keys(value);
  if (
    keys.length < 1 ||
    keys.length > 2 ||
    !keys.includes("primary") ||
    keys.some((key) => key !== "primary" && key !== "secondary")
  ) {
    throw new TalentAuthSecretConfigurationErrorV1();
  }

  const primary = value.primary;
  if (
    typeof primary !== "string" ||
    !isValidOpaqueBearerCredentialV1(primary)
  ) {
    throw new TalentAuthSecretConfigurationErrorV1();
  }

  const hasSecondary = Object.prototype.hasOwnProperty.call(
    value,
    "secondary",
  );
  if (!hasSecondary) {
    return Object.freeze({ primary });
  }

  const secondary = value.secondary;
  if (
    typeof secondary !== "string" ||
    !isValidOpaqueBearerCredentialV1(secondary) ||
    secondary === primary
  ) {
    throw new TalentAuthSecretConfigurationErrorV1();
  }

  return Object.freeze({ primary, secondary });
}
