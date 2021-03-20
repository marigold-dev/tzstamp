/**
 * Serialize unsigned 8-bit integer array as hexadecimal string
 */
export function stringify (bytes: Uint8Array): string {
  return Array
    .from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0')) // Map each byte to a 2-digit hex string
    .join('')
}

/**
 * Parse hexadecimal string as unsigned 8-bit integer array
 */
export function parse (hex: string): Uint8Array {

  // Validate hex string
  if (!hex.match(/^[0-9a-fA-F]+$/))
    throw new Error('Invalid hex string')

  // Convert bytes to 2-digit
  const bytes = hex
    .padStart(hex.length + hex.length % 2, '0') // ensure even number of characters
    .match(/.{2}/g) // split into 2-digit hex strings
    .map(byte => parseInt(byte, 16)) // Convert each 2-digit hex string to a number

  return new Uint8Array(bytes)
}
