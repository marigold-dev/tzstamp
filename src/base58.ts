import * as Hex from "./hex.ts";
import { compare, concat } from "./bytes.ts";
import { createHash } from "./deps.deno.ts";

/**
 * SHA-256 hash helper
 */
function sha256(bytes: Uint8Array): Uint8Array {
  const digest = createHash("sha256")
    .update(bytes)
    .digest();
  return new Uint8Array(digest);
}

/**
 * Base58 Encoding Scheme helpers
 */
export const Base58 = {
  /**
   * The common base-58 alphabet
   *
   * @see {@link https://tools.ietf.org/id/draft-msporny-base58-01.html#alphabet}
   * for details
   */
  ALPHABET: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",

  /**
   * Encode byte array as base58 string
   *
   * @see {@link https://tools.ietf.org/id/draft-msporny-base58-01.html#encode|The Base58 Encoding Scheme}
   * for details
   */
  encode(bytes: Uint8Array): string {
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
      encoding = Base58.ALPHABET[mod] + encoding;
    }

    // Prepend padding for leading zeroes in the byte array
    for (let i = 0; bytes[i] == 0; ++i) {
      encoding = Base58.ALPHABET[0] + encoding;
    }

    return encoding;
  },

  /**
   * Decode base58 string to byte array
   *
   * @see {@link https://tools.ietf.org/id/draft-msporny-base58-01.html#encode|The Base58 Encoding Scheme}
   * for details
   */
  decode(input: string): Uint8Array {
    // Empty string
    if (input.length == 0) {
      return new Uint8Array([]);
    }

    // Convert to integer
    let int = 0n;
    for (const char of input) {
      const index = Base58.ALPHABET.indexOf(char);
      if (index == -1) {
        throw new SyntaxError(
          `Invalid base58 string: The base-58 alphabet doesn't include the character "${char}"`,
        );
      }
      int = int * 58n + BigInt(index);
    }

    const bytes: number[] = [];

    // Construct byte array
    for (let n = int; n > 0n; n /= 256n) {
      bytes.push(Number(n % 256n));
    }

    // Prepend leading zeroes
    for (let i = 0; input[i] == Base58.ALPHABET[0]; ++i) {
      bytes.push(0);
    }

    return new Uint8Array(bytes.reverse());
  },

  /**
   * Encode with checksum
   *
   * @see {@link https://github.com/bitcoin/bitcoin/blob/master/src/base58.cpp#L135|base58.cpp}
   * for original C++ implementation
   */
  encodeCheck(bytes: Uint8Array): string {
    const checksum = sha256(sha256(bytes)).slice(0, 4);
    return Base58.encode(concat(bytes, checksum));
  },

  /**
   * Decode with checksum
   *
   * @see {@link https://github.com/bitcoin/bitcoin/blob/master/src/base58.cpp#L144|base58.cpp}
   * for original C++ implementation
   */
  decodeCheck(input: string): Uint8Array {
    const bytes = Base58.decode(input);
    const payload = bytes.slice(0, -4);
    const checksum = sha256(sha256(payload)).slice(0, 4);
    if (!compare(checksum, bytes.slice(-4))) {
      throw new Error(`Base-58 checksum did not match`);
    }
    return payload;
  },
};
