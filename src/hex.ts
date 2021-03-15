/**
 * Serialize unsigned 8-bit integer array as hexadecimal string
 */
export const stringify = (array: Uint8Array): string => Array
  .from(array)
  .map(byte => byte
    .toString(16)
    .padStart(2, '0') // ensure leading zero for bytes less than 16
  )
  .join('')

/**
 * Parse hexadecimal string as unsigned 8-bit integer array
 */
export const parse = (hex: string): Uint8Array => {
  
  // Validate
  if (!hex.match(/^[0-9a-fA-F]+$/))
    throw new Error('Invalid hex string')
  
  // Parse byte array
  const bytes = hex
    .padStart(hex.length + hex.length % 2, '0') // ensure even number of characters
    .match(/.{2}/g) // split into hex pairs (bytes)
    .map(byte => parseInt(byte, 16))
  
  return new Uint8Array(bytes)
}
