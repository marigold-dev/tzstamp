import { Schema, validate } from "./deps.deno.ts";
export type { Schema };

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
