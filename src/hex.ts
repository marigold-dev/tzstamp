/**
 * Serialize unsigned 8-bit integer array as hexadecimal string
 *
 * @param bytes Bytes array
 */
export function stringify(bytes: Uint8Array): string {
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
 * Hexidecimal string regular expression
 */
export const HEX_STRING = /^[0-9a-fA-F]+$/;

/**
 * Parse hexadecimal string as unsigned 8-bit integer array
 *
 * @param input Hexidecimal string
 * @return Byte array corresponding to hexidecimal string
 */
export function parse(input: string): Uint8Array {
  // Empty string
  if (input.length == 0) {
    return new Uint8Array([]);
  }

  // Validate hex string
  if (!HEX_STRING.test(input)) {
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
