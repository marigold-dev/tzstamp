/**
 * Encode byte as hexidecimal digit pair
 */
const encodeHex = byte => byte
  .toString(16)
  .padStart(2, '0')

/**
 * Serialize unsigned 8-bit integer array as hexadecimal string
 */
export const stringify = (array: Uint8Array): string => Array
  .from(array)
  .map(encodeHex)
  .join('')

/**
 * Hexadecimal string regular expression
 */
const hexRegExp = /^[0-9a-fA-F]+$/

/**
 * Parse hexadecimal string as unsigned 8-bit integer array
 */
export const parse = (hex: string): Uint8Array => {
  if (!hex.match(hexRegExp))
    throw new Error('Invalid hex string')
  const bytes = hex
    .padStart(hex.length + hex.length % 2, '0')
    .match(/.{2}/g)
    .map(byte => parseInt(byte, 16))
  return new Uint8Array(bytes)
}
