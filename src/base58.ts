import * as Hex from "./hex.ts";
import { compare, concat } from "./bytes.ts";
import { assert, createHash } from "./deps.deno.ts";

function sha256(bytes: Uint8Array): Uint8Array {
  const digest = createHash("sha256")
    .update(bytes)
    .digest();
  return new Uint8Array(digest);
}

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 * Base58 string validation regular expression.
 * Tests a string against the common Base58 alphabet
 * as defined in the the [Base58 Encoding Scheme].
 *
 * [Base58 Encoding Scheme]: https://tools.ietf.org/id/draft-msporny-base58-01.html#alphabet
 */
export const validator = /^[1-9A-HJ-NP-Za-km-z]*$/;

/**
 * Encodes a byte array as a Base58 string as
 * described in the [Base58 Encoding Scheme].
 *
 * ```js
 * Base58.encode(new Uint8Array([55, 66, 77]));
 * // "KZXr"
 * ```
 *
 * [Base58 Encoding Scheme]: https://tools.ietf.org/id/draft-msporny-base58-01.html#encode
 */
export function encode(bytes: Uint8Array): string {
  assert(bytes instanceof Uint8Array, "bytes must be a Uint8Array");

  // Empty array
  if (bytes.length == 0) {
    return "";
  }

  // Convert to integer
  const int = BigInt("0x" + Hex.stringify(bytes));

  let encoding = "";

  // Encode as base-58
  for (let n = int; n > 0n; n /= 58n) {
    const mod = Number(n % 58n);
    encoding = ALPHABET[mod] + encoding;
  }

  // Prepend padding for leading zeroes in the byte array
  for (let i = 0; bytes[i] == 0; ++i) {
    encoding = ALPHABET[0] + encoding;
  }

  return encoding;
}

/**
 * Decodes a Base58 string to a byte array
 * as described in the [Base58 Encoding Scheme].
 * Throws `SyntaxError` if the input string contains letters
 * not included in the [Base58 Alphabet].
 *
 * ```js
 * Base58.decode("u734C");
 * // Uint8Array(4) [ 35, 37, 31, 49 ]
 * ```
 *
 * [Base58 Alphabet]: https://tools.ietf.org/id/draft-msporny-base58-01.html#alphabet
 * [Base58 Encoding Scheme]: https://tools.ietf.org/id/draft-msporny-base58-01.html#decode
 */
export function decode(input: string): Uint8Array {
  assert(typeof input == "string", "input must be a string");

  // Validate string
  if (!validator.test(input)) {
    throw new SyntaxError(`Invalid Base58 string`);
  }

  // Empty string
  if (input.length == 0) {
    return new Uint8Array([]);
  }

  // Convert to integer
  let int = 0n;
  for (const char of input) {
    const index = ALPHABET.indexOf(char);
    int = int * 58n + BigInt(index);
  }

  const bytes: number[] = [];

  // Construct byte array
  for (let n = int; n > 0n; n /= 256n) {
    bytes.push(Number(n % 256n));
  }

  // Prepend leading zeroes
  for (let i = 0; input[i] == ALPHABET[0]; ++i) {
    bytes.push(0);
  }

  return new Uint8Array(bytes.reverse());
}

/**
 * Encodes a byte array as a Base58 string with a checksum.
 * See the [Bitcoin source code] for the original C++ implementation.
 *
 * ```js
 * Base58.encodeCheck(new Uint8Array([55, 66, 77]));
 * // "36TSqepyLV"
 * ```
 *
 * [Bitcoin source code]: https://github.com/bitcoin/bitcoin/blob/master/src/base58.cpp#L135
 */
export function encodeCheck(bytes: Uint8Array): string {
  assert(bytes instanceof Uint8Array, "bytes must be a Uint8Array");
  const checksum = sha256(sha256(bytes)).slice(0, 4);
  return encode(concat(bytes, checksum));
}

/**
 * Decodes and validates a Base58 string with a checksum to a byte array.
 * Throws `AssertionError` if the checksum does not match.
 * See the [Bitcoin source code] for the original C++ implementation.
 *
 * ```js
 * Base58.decodeCheck("6sx8oP1Sgpe");
 * // Uint8Array(4) [ 35, 37, 31, 49 ]
 * ```
 *
 * [Bitcoin source code]: https://github.com/bitcoin/bitcoin/blob/master/src/base58.cpp#L144
 */
export function decodeCheck(input: string): Uint8Array {
  assert(typeof input == "string", "input must be a string");

  const bytes = decode(input);
  const payload = bytes.slice(0, -4);
  const checksum = sha256(sha256(payload)).slice(0, 4);

  assert(
    compare(checksum, bytes.slice(-4)),
    "Base58 checksum did not match",
  );

  return payload;
}
