/*!
 * Portions of this module are copied from micro-base58,
 * Copyright (c) 2020 Paul Miller (https://paulmillr.com),
 * for use under the MIT license.
 */

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

  let x = BigInt('0x' + Hex.stringify(bytes))
  let output = []
  while (x > 0n) {
    const mod = Number(x % 58n)
    x = x / 58n
    output.push(ALPHABET[mod])
  }
  for (let i = 0; bytes[i] == 0; ++i) {
    output.push(ALPHABET[0])
  }
  return output.reverse().join('')
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

  const bytes = [ 0 ]
  for (const char of input) {
    const value = ALPHABET.indexOf(char)
    if (value == -1) {
      throw new SyntaxError(`Invalid base58 string: The base-58 alphabet doesn't include the character "${char}"`)
    }
    for (const j in bytes) bytes[j] *= 58
    bytes[0] += value
    let carry = 0
    for (const j in bytes) {
      bytes[j] += carry
      carry = bytes[j] >> 8
      bytes[j] &= 0xff
    }
    while (carry > 0) {
      bytes.push(carry & 0xff)
      carry >>= 8
    }
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