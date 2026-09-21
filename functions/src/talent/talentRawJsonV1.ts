import { TALENT_MAX_RAW_BODY_BYTES_V1 } from "./talentBridgeConstantsV1.js";
import { throwTalentEndpointErrorV1 } from "./talentEndpointErrorsV1.js";

const TALENT_STRICT_JSON_PARSER_MAX_CONTAINER_DEPTH_V1 = 128;

export interface TalentRawJsonRequestV1 {
  readonly rawHeaders: readonly string[];
  readonly rawBody: unknown;
}

function readRawHeaderValues(
  rawHeaders: readonly string[],
  targetName: string,
): string[] {
  if (!Array.isArray(rawHeaders) || rawHeaders.length % 2 !== 0) {
    return throwTalentEndpointErrorV1("UNSUPPORTED_MEDIA_TYPE");
  }

  const values: string[] = [];
  for (let index = 0; index < rawHeaders.length; index += 2) {
    const name = rawHeaders[index];
    const value = rawHeaders[index + 1];
    if (typeof name !== "string" || typeof value !== "string") {
      return throwTalentEndpointErrorV1("UNSUPPORTED_MEDIA_TYPE");
    }
    if (name.toLowerCase() === targetName) {
      values.push(value);
    }
  }
  return values;
}

function validateMediaHeaders(rawHeaders: readonly string[]): void {
  const contentTypes = readRawHeaderValues(rawHeaders, "content-type");
  if (contentTypes.length !== 1) {
    throwTalentEndpointErrorV1("UNSUPPORTED_MEDIA_TYPE");
  }

  const contentType = contentTypes[0].toLowerCase();
  if (
    contentType !== "application/json" &&
    contentType !== "application/json; charset=utf-8"
  ) {
    throwTalentEndpointErrorV1("UNSUPPORTED_MEDIA_TYPE");
  }

  const encodings = readRawHeaderValues(rawHeaders, "content-encoding");
  if (
    encodings.length > 1 ||
    (encodings.length === 1 && encodings[0].toLowerCase() !== "identity")
  ) {
    throwTalentEndpointErrorV1("UNSUPPORTED_MEDIA_TYPE");
  }
}

class StrictJsonParserV1 {
  private index = 0;

  constructor(private readonly source: string) {}

  parseRootObject(): Record<string, unknown> {
    this.skipWhitespace();
    if (this.source[this.index] !== "{") {
      return throwTalentEndpointErrorV1("MALFORMED_REQUEST");
    }
    const value = this.parseObject(1);
    this.skipWhitespace();
    if (this.index !== this.source.length) {
      return throwTalentEndpointErrorV1("MALFORMED_REQUEST");
    }
    return value;
  }

  private parseValue(depth: number): unknown {
    this.skipWhitespace();
    const token = this.source[this.index];
    if (token === "{") return this.parseObject(depth);
    if (token === "[") return this.parseArray(depth);
    if (token === "\"") return this.parseString();
    if (token === "t") return this.parseLiteral("true", true);
    if (token === "f") return this.parseLiteral("false", false);
    if (token === "n") return this.parseLiteral("null", null);
    if (token === "-" || (token >= "0" && token <= "9")) {
      return this.parseNumber();
    }
    return throwTalentEndpointErrorV1("MALFORMED_REQUEST");
  }

  private parseObject(depth: number): Record<string, unknown> {
    if (depth > TALENT_STRICT_JSON_PARSER_MAX_CONTAINER_DEPTH_V1) {
      return throwTalentEndpointErrorV1("SCHEMA_VIOLATION");
    }
    this.index += 1;
    const result: Record<string, unknown> = {};
    const keys = new Set<string>();
    this.skipWhitespace();
    if (this.source[this.index] === "}") {
      this.index += 1;
      return result;
    }

    while (this.index < this.source.length) {
      if (this.source[this.index] !== "\"") {
        return throwTalentEndpointErrorV1("MALFORMED_REQUEST");
      }
      const key = this.parseString();
      if (keys.has(key)) {
        return throwTalentEndpointErrorV1("MALFORMED_REQUEST");
      }
      keys.add(key);
      this.skipWhitespace();
      if (this.source[this.index] !== ":") {
        return throwTalentEndpointErrorV1("MALFORMED_REQUEST");
      }
      this.index += 1;
      Object.defineProperty(result, key, {
        value: this.parseValue(depth + 1),
        enumerable: true,
        configurable: true,
        writable: true,
      });
      this.skipWhitespace();
      const separator = this.source[this.index];
      if (separator === "}") {
        this.index += 1;
        return result;
      }
      if (separator !== ",") {
        return throwTalentEndpointErrorV1("MALFORMED_REQUEST");
      }
      this.index += 1;
      this.skipWhitespace();
    }
    return throwTalentEndpointErrorV1("MALFORMED_REQUEST");
  }

  private parseArray(depth: number): unknown[] {
    if (depth > TALENT_STRICT_JSON_PARSER_MAX_CONTAINER_DEPTH_V1) {
      return throwTalentEndpointErrorV1("SCHEMA_VIOLATION");
    }
    this.index += 1;
    const result: unknown[] = [];
    this.skipWhitespace();
    if (this.source[this.index] === "]") {
      this.index += 1;
      return result;
    }

    while (this.index < this.source.length) {
      result.push(this.parseValue(depth + 1));
      this.skipWhitespace();
      const separator = this.source[this.index];
      if (separator === "]") {
        this.index += 1;
        return result;
      }
      if (separator !== ",") {
        return throwTalentEndpointErrorV1("MALFORMED_REQUEST");
      }
      this.index += 1;
    }
    return throwTalentEndpointErrorV1("MALFORMED_REQUEST");
  }

  private parseString(): string {
    const start = this.index;
    this.index += 1;
    while (this.index < this.source.length) {
      const character = this.source.charCodeAt(this.index);
      if (character === 0x22) {
        this.index += 1;
        try {
          return JSON.parse(this.source.slice(start, this.index)) as string;
        } catch {
          return throwTalentEndpointErrorV1("MALFORMED_REQUEST");
        }
      }
      if (character <= 0x1f) {
        return throwTalentEndpointErrorV1("MALFORMED_REQUEST");
      }
      if (character === 0x5c) {
        this.index += 1;
        const escaped = this.source[this.index];
        if (escaped === "u") {
          const hexadecimal = this.source.slice(this.index + 1, this.index + 5);
          if (!/^[0-9a-fA-F]{4}$/u.test(hexadecimal)) {
            return throwTalentEndpointErrorV1("MALFORMED_REQUEST");
          }
          this.index += 4;
        } else if (!'\"\\/bfnrt'.includes(escaped ?? "")) {
          return throwTalentEndpointErrorV1("MALFORMED_REQUEST");
        }
      }
      this.index += 1;
    }
    return throwTalentEndpointErrorV1("MALFORMED_REQUEST");
  }

  private parseNumber(): number {
    const match = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/u.exec(
      this.source.slice(this.index),
    );
    if (match === null) {
      return throwTalentEndpointErrorV1("MALFORMED_REQUEST");
    }
    this.index += match[0].length;
    return Number(match[0]);
  }

  private parseLiteral<T>(literal: string, value: T): T {
    if (this.source.slice(this.index, this.index + literal.length) !== literal) {
      return throwTalentEndpointErrorV1("MALFORMED_REQUEST");
    }
    this.index += literal.length;
    return value;
  }

  private skipWhitespace(): void {
    while (
      this.source[this.index] === " " ||
      this.source[this.index] === "\n" ||
      this.source[this.index] === "\r" ||
      this.source[this.index] === "\t"
    ) {
      this.index += 1;
    }
  }
}

export function parseTalentRawJsonV1(
  request: TalentRawJsonRequestV1,
): Record<string, unknown> {
  validateMediaHeaders(request.rawHeaders);
  const rawBody = request.rawBody;
  if (!Buffer.isBuffer(rawBody)) {
    return throwTalentEndpointErrorV1("INTERNAL_FAILURE");
  }
  if (rawBody.length > TALENT_MAX_RAW_BODY_BYTES_V1) {
    return throwTalentEndpointErrorV1("REQUEST_TOO_LARGE");
  }
  if (rawBody.length === 0) {
    return throwTalentEndpointErrorV1("MALFORMED_REQUEST");
  }

  let decoded: string;
  try {
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(rawBody);
  } catch {
    return throwTalentEndpointErrorV1("MALFORMED_REQUEST");
  }
  return new StrictJsonParserV1(decoded).parseRootObject();
}
