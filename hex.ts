import { assert } from "./deps.ts";

/**
 * Hexidecimal string validation regular expression.
 * Matches strings comprised of only the 16 hexidecimal symbols,
 * case-insensitively.
 */
export const validator = /^[0-9a-fA-F]+$/;

/**
 * Creates a hexidecimal string from a byte array.
 *
 * ```js
 * Hex.stringify(new Uint8Array([49, 125, 7]));
 * // "317d07"
 * ```
 *
 * @param bytes Byte array
 */
export function stringify(bytes: Uint8Array): string {
  assert(bytes instanceof Uint8Array, "bytes must be a Uint8Array");

  return Array
    .from(bytes)
    .map((byte) =>
      // Map each byte to a 2-digit hex string
      byte
        .toString(16)
        .padStart(2, "0")
    )
    .join("");
}

/**
 * Parses a hexadecimal string to a byte array.
 * Throws `SyntaxError` if the hexidecimal string is invalid.
 *
 * ```js
 * Hex.parse("395f001");
 * // Uint8Array(4) [ 3, 149, 240, 1 ]
 * ```
 *
 * @param input Hexidecimal string
 */
export function parse(input: string): Uint8Array {
  assert(typeof input == "string", "input must be a string");

  // Empty string
  if (input.length == 0) {
    return new Uint8Array([]);
  }

  // Validate hex string
  if (!validator.test(input)) {
    throw new SyntaxError("Invalid hexidecimal string");
  }

  // Setup byte array
  const byteCount = Math.ceil(input.length / 2);
  const bytes = new Uint8Array(byteCount);

  // Populate byte array
  for (let index = 0; index < input.length / 2; ++index) {
    const offset = index * 2 - input.length % 2;
    const hexByte = input.substring(offset, offset + 2);
    bytes[index] = parseInt(hexByte, 16);
  }

  return bytes;
}
