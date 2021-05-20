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

/**
 * Removes all fields set to `undefined` in an object instance.
 *
 * ```ts
 * interface Metasyntactic {
 *   foo?: boolean,
 *   bar?: boolean,
 *   baz?: boolean
 * }
 *
 * filterUndefined<Metasyntactic>({
 *   foo: undefined,
 *   bar: true,
 *   baz: undefined
 * });
 * // { bar: true }, implements Metasyntactic
 * ```
 *
 * @param template Template object
 */
export function filterUndefined<T>(instance: T): T {
  for (const key in instance) {
    if (instance[key] === undefined) {
      delete instance[key];
    }
  }
  return instance;
}
