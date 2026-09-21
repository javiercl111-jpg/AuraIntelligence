import { strict as assert } from "node:assert";
import { test } from "node:test";

import { TalentEndpointErrorV1 } from "./talentEndpointErrorsV1.js";
import { enforceTalentPiiGovernanceV1 } from "./talentPiiGovernanceV1.js";
import { parseTalentRawJsonV1 } from "./talentRawJsonV1.js";

function request(
  body: Buffer = Buffer.from('{"value":1}', "utf8"),
  rawHeaders: readonly string[] = ["Content-Type", "application/json"],
): { readonly rawHeaders: readonly string[]; readonly rawBody: Buffer } {
  return { rawHeaders, rawBody: body };
}

function assertError(
  code: TalentEndpointErrorV1["code"],
  operation: () => unknown,
  message?: string,
): void {
  assert.throws(operation, (error: unknown) => (
    error instanceof TalentEndpointErrorV1 && error.code === code
  ), message);
}

function parseJson(json: string): Record<string, unknown> {
  return parseTalentRawJsonV1(request(Buffer.from(json, "utf8")));
}

function nestedContainerJson(depth: number): string {
  const nestedArrayDepth = depth - 1;
  return (
    `{"value":${"[".repeat(nestedArrayDepth)}` +
    `null${"]".repeat(nestedArrayDepth)}}`
  );
}

test("accepts only the two ratified JSON content types", () => {
  for (const contentType of [
    "application/json",
    "APPLICATION/JSON",
    "application/json; charset=utf-8",
    "Application/Json; Charset=UTF-8",
  ]) {
    assert.deepEqual(
      parseTalentRawJsonV1(request(undefined, ["Content-Type", contentType])),
      { value: 1 },
    );
  }
});

test("rejects missing, wrong, parameterized, and duplicate Content-Type", () => {
  for (const headers of [
    [],
    ["Content-Type", "text/json"],
    ["Content-Type", "application/problem+json"],
    ["Content-Type", "application/json; charset=us-ascii"],
    ["Content-Type", "application/json", "content-type", "application/json"],
  ]) {
    assertError("UNSUPPORTED_MEDIA_TYPE", () => (
      parseTalentRawJsonV1(request(undefined, headers))
    ));
  }
});

test("accepts absent or identity encoding and rejects unsupported or duplicate encoding", () => {
  assert.deepEqual(parseTalentRawJsonV1(request()), { value: 1 });
  assert.deepEqual(parseTalentRawJsonV1(request(undefined, [
    "Content-Type", "application/json",
    "Content-Encoding", "IDENTITY",
  ])), { value: 1 });

  for (const headers of [
    ["Content-Type", "application/json", "Content-Encoding", "gzip"],
    [
      "Content-Type", "application/json",
      "Content-Encoding", "identity",
      "content-encoding", "identity",
    ],
  ]) {
    assertError("UNSUPPORTED_MEDIA_TYPE", () => (
      parseTalentRawJsonV1(request(undefined, headers))
    ));
  }
});

test("enforces the actual rawBody boundary at 262143, 262144, and 262145 bytes", () => {
  const bodyAt = (size: number): Buffer => {
    const json = Buffer.from("{}", "utf8");
    return Buffer.concat([json, Buffer.alloc(size - json.length, 0x20)]);
  };
  assert.deepEqual(parseTalentRawJsonV1(request(bodyAt(262_143))), {});
  assert.deepEqual(parseTalentRawJsonV1(request(bodyAt(262_144))), {});
  assertError("REQUEST_TOO_LARGE", () => (
    parseTalentRawJsonV1(request(bodyAt(262_145)))
  ));
});

test("ignores absent and lying Content-Length as size authority", () => {
  assert.deepEqual(parseTalentRawJsonV1(request()), { value: 1 });
  assert.deepEqual(parseTalentRawJsonV1(request(undefined, [
    "Content-Type", "application/json",
    "Content-Length", "999999999",
  ])), { value: 1 });
  const oversized = Buffer.alloc(262_145, 0x20);
  assertError("REQUEST_TOO_LARGE", () => parseTalentRawJsonV1(request(oversized, [
    "Content-Type", "application/json",
    "Content-Length", "2",
  ])));
});

test("rejects empty input, invalid UTF-8, malformed JSON, and non-object roots", () => {
  for (const body of [
    Buffer.alloc(0),
    Buffer.from([0xc3, 0x28]),
    Buffer.from('{"value":}', "utf8"),
    Buffer.from("null", "utf8"),
    Buffer.from("1", "utf8"),
    Buffer.from("[]", "utf8"),
  ]) {
    assertError("MALFORMED_REQUEST", () => parseTalentRawJsonV1(request(body)));
  }
});

test("accepts strict JSON token and escape forms", () => {
  const cases: ReadonlyArray<{
    readonly name: string;
    readonly json: string;
    readonly expected: Record<string, unknown>;
  }> = [
    {
      name: "escaped quotes in keys and values",
      json: '{"quo\\"te":"a \\"value\\""}',
      expected: { 'quo"te': 'a "value"' },
    },
    {
      name: "escaped reverse solidus",
      json: '{"key\\\\part":"C:\\\\temp"}',
      expected: { "key\\part": "C:\\temp" },
    },
    {
      name: "escaped solidus",
      json: '{"a\\/b":"c\\/d"}',
      expected: { "a/b": "c/d" },
    },
    {
      name: "standard escapes",
      json: '{"value":"\\b\\f\\n\\r\\t"}',
      expected: { value: "\b\f\n\r\t" },
    },
    {
      name: "Unicode escapes",
      json: (
        '{"letter":"\\u0061","symbol":"\\u263a",' +
        '"pair":"\\ud83d\\ude00"}'
      ),
      expected: { letter: "a", symbol: "\u263a", pair: "\ud83d\ude00" },
    },
    {
      name: "decoded keys and values",
      json: '{"\\u0061":"first","b":"\\u0061"}',
      expected: { a: "first", b: "a" },
    },
    {
      name: "nested objects",
      json: '{"outer":{"inner":{"value":true}}}',
      expected: { outer: { inner: { value: true } } },
    },
    {
      name: "nested arrays",
      json: '{"items":[[[1]]]}',
      expected: { items: [[[1]]] },
    },
    {
      name: "empty nested containers",
      json: '{"object":{},"array":[]}',
      expected: { object: {}, array: [] },
    },
    {
      name: "array containing every JSON value kind",
      json: '{"items":["text",1,true,false,null,{"value":2},[3]]}',
      expected: {
        items: ["text", 1, true, false, null, { value: 2 }, [3]],
      },
    },
    {
      name: "valid integers",
      json: '{"zero":0,"positive":42}',
      expected: { zero: 0, positive: 42 },
    },
    {
      name: "valid negative numbers",
      json: '{"value":-42}',
      expected: { value: -42 },
    },
    {
      name: "valid fractions",
      json: '{"positive":12.5,"negative":-0.25}',
      expected: { positive: 12.5, negative: -0.25 },
    },
    {
      name: "valid exponent forms",
      json: '{"lower":1e3,"upper":2E+2,"negative":5e-1}',
      expected: { lower: 1_000, upper: 200, negative: 0.5 },
    },
    {
      name: "legal trailing JSON whitespace",
      json: '{"value":1} \t\r\n',
      expected: { value: 1 },
    },
  ];

  for (const { name, json, expected } of cases) {
    assert.deepEqual(parseJson(json), expected, name);
  }
});

test("rejects malformed strict JSON token and escape forms", () => {
  const cases: ReadonlyArray<{
    readonly name: string;
    readonly json: string;
  }> = [
    { name: "duplicate plain keys", json: '{"a":1,"a":2}' },
    {
      name: "duplicate keys equal only after decoding",
      json: '{"a":1,"\\u0061":2}',
    },
    {
      name: "nested duplicate plain keys",
      json: '{"outer":{"a":1,"a":2}}',
    },
    {
      name: "duplicate plain keys in an array object",
      json: '{"items":[{"a":1,"a":2}]}',
    },
    { name: "malformed Unicode escape", json: '{"value":"\\u12g4"}' },
    { name: "incomplete Unicode escape", json: '{"value":"\\u123"}' },
    { name: "malformed standard escape", json: '{"value":"\\q"}' },
    { name: "unescaped control character", json: '{"value":"a\nb"}' },
    { name: "unterminated value string", json: '{"value":"open}' },
    { name: "unterminated key string", json: '{"value:1}' },
    { name: "unquoted object key", json: '{value:1}' },
    { name: "malformed true literal", json: '{"value":tru}' },
    { name: "malformed false literal", json: '{"value":fals}' },
    { name: "malformed null literal", json: '{"value":nul}' },
    { name: "positive leading zero", json: '{"value":01}' },
    { name: "negative leading zero", json: '{"value":-01}' },
    { name: "bare negative sign", json: '{"value":-}' },
    { name: "incomplete fraction", json: '{"value":1.}' },
    { name: "incomplete negative fraction", json: '{"value":-0.}' },
    { name: "incomplete exponent", json: '{"value":1e}' },
    { name: "incomplete positive exponent", json: '{"value":1e+}' },
    { name: "incomplete negative exponent", json: '{"value":1E-}' },
    { name: "missing object value", json: '{"value":}' },
    { name: "missing array value", json: '{"items":[1,,2]}' },
    { name: "missing object colon", json: '{"value" 1}' },
    { name: "missing object comma", json: '{"a":1 "b":2}' },
    { name: "missing array comma", json: '{"items":[1 2]}' },
    { name: "object trailing comma", json: '{"value":1,}' },
    { name: "array trailing comma", json: '{"items":[1,]}' },
    { name: "trailing non-whitespace material", json: '{"value":1}x' },
  ];

  for (const { name, json } of cases) {
    assertError("MALFORMED_REQUEST", () => parseJson(json), name);
  }
});

test("aligns parser safety depth with eight-container governance", () => {
  const depthEight = parseJson(nestedContainerJson(8));
  assert.doesNotThrow(() => enforceTalentPiiGovernanceV1(depthEight));

  for (const depth of [9, 128]) {
    const parsed = parseJson(nestedContainerJson(depth));
    assertError("SCHEMA_VIOLATION", () => (
      enforceTalentPiiGovernanceV1(parsed)
    ));
  }

  assertError("SCHEMA_VIOLATION", () => (
    parseJson(nestedContainerJson(129))
  ));
});

test("rejects missing rawBody as an internal platform failure", () => {
  assertError("INTERNAL_FAILURE", () => parseTalentRawJsonV1({
    rawHeaders: ["Content-Type", "application/json"],
    rawBody: undefined,
  }));
});
