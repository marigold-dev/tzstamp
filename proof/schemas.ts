import { Schema, validate } from "./deps.ts";

/**
 * Checks that an instance is valid against a [JTD] schema,
 * narrowing the instance type on successful validation.
 *
 * ```ts
 * enum Color {
 *   Red = "red",
 *   Blue = "blue",
 *   Green = "green",
 * };
 *
 * const colors: Schema = {
 *   enum: ["red", "blue", "green"]
 * };
 *
 * const green = "green";
 *
 * if (isValid<Color>(colors, green)) {
 *   // `green` is narrowed to `Color`
 * }
 * ```
 *
 * @param schema JTD schema
 * @param instance Value to validate
 *
 * [JTD]: https://jsontypedef.com
 */
export function isValid<T>(schema: Schema, instance: unknown): instance is T {
  return validate(schema, instance).length == 0;
}

/**
 * Operation template [JSON Type Definition](https://datatracker.ietf.org/doc/html/rfc8927) schema
 */
export const operationSchema: Schema = {
  discriminator: "type",
  mapping: {
    "join": {
      optionalProperties: {
        prepend: { type: "string" },
        append: { type: "string" },
      },
    },
    "blake2b": {
      optionalProperties: {
        length: { type: "uint32" },
        key: { type: "string" },
      },
    },
    "sha256": {
      properties: {},
    },
  },
} as const;

/**
 * Proof template [JSON Type Definition](https://datatracker.ietf.org/doc/html/rfc8927) schema
 */
export const proofSchema: Schema = {
  properties: {
    version: { type: "uint32" },
    hash: { type: "string" },
    operations: {
      elements: operationSchema,
    },
  },
  optionalProperties: {
    network: { type: "string" },
    timestamp: { type: "timestamp" },
    remote: { type: "string" },
  },
} as const;

/**
 * Affixed proof template [JSON Type Definition](https://datatracker.ietf.org/doc/html/rfc8927) schema
 */
export const affixedProofSchema: Schema = {
  properties: {
    ...proofSchema.properties,
    network: { type: "string" },
    timestamp: { type: "timestamp" },
  },
} as const;

/**
 * Unresolved proof template [JSON Type Definition](https://datatracker.ietf.org/doc/html/rfc8927) schema
 */
export const unresolvedProofSchema: Schema = {
  properties: {
    ...proofSchema.properties,
    remote: { type: "string" },
  },
} as const;

/**
 * Tezos block header [JSON Type Definition](https://datatracker.ietf.org/doc/html/rfc8927) schema
 */
export const blockHeaderSchema: Schema = {
  properties: {
    timestamp: { type: "timestamp" },
  },
  additionalProperties: true,
} as const;
