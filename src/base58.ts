import * as Hex from './hex'
import { concat, compare } from './bytes'
import { createHash } from 'crypto'

/**
 * SHA-256 hash helper
 */
function sha256 (bytes: Uint8Array): Uint8Array {
  const digest = createHash('SHA256')
    .update(bytes)
    .digest()
  return new Uint8Array(digest)
}

/**
 * The common base-58 alphabet
 *
 * @see {@link https://tools.ietf.org/id/draft-msporny-base58-01.html#alphabet}
 * for details
 */
export const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

/**
 * Encode byte array as base58 string
 *
 * @see {@link https://tools.ietf.org/id/draft-msporny-base58-01.html#encode|The Base58 Encoding Scheme}
 * for details
 */
export function encode (bytes: Uint8Array): string {

  // Empty array
  if (bytes.length == 0) {
    return ''
  }

  // Convert to integer
  const int = BigInt('0x' + Hex.stringify(bytes))

  let encoding = ''

  // Encode as base-58
  for (let n = int; n > 0n; n /= 58n) {
    const mod = Number(n % 58n)
    encoding = ALPHABET[mod] + encoding
  }

  // Prepend padding for leading zeroes in the byte array
  for (let i = 0; bytes[i] == 0; ++i) {
    encoding = ALPHABET[0] + encoding
  }

  return encoding
}

/**
 * Decode base58 string to byte array
 *
 * @see {@link https://tools.ietf.org/id/draft-msporny-base58-01.html#encode|The Base58 Encoding Scheme}
 * for details
 */
export function decode (input: string): Uint8Array {

  // Empty string
  if (input.length == 0) {
    return new Uint8Array([])
  }

  // Convert to integer
  let int = 0n
  for (const char of input) {
    const index = ALPHABET.indexOf(char)
    if (index == -1) {
      throw new SyntaxError(`Invalid base58 string: The base-58 alphabet doesn't include the character "${char}"`)
    }
    int = int * 58n + BigInt(index)
  }

  const bytes: number[] = []

  // Construct byte array
  for (let n = int; n > 0n; n /= 256n) {
    bytes.push(Number(n % 256n))
  }

  // Prepend leading zeroes
  for (let i = 0; input[i] == ALPHABET[0]; ++i) {
    bytes.push(0)
  }

  return new Uint8Array(bytes.reverse())
}

/**
 * Encode with checksum
 *
 * @see {@link https://github.com/bitcoin/bitcoin/blob/master/src/base58.cpp#L135|base58.cpp}
 * for original C++ implementation
 */
export function encodeCheck (bytes: Uint8Array): string {
  const checksum = sha256(sha256(bytes)).slice(0, 4)
  return encode(concat(bytes, checksum))
}

/**
 * Decode with checksum
 *
 * @see {@link https://github.com/bitcoin/bitcoin/blob/master/src/base58.cpp#L144|base58.cpp}
 * for original C++ implementation
 */
export function decodeCheck (input: string): Uint8Array {
  const bytes = decode(input)
  const payload = bytes.slice(0, -4)
  const checksum = sha256(sha256(payload)).slice(0, 4)
  if (!compare(checksum, bytes.slice(-4))) {
    throw new Error(`Base-58 checksum did not match`)
  }
  return payload
}