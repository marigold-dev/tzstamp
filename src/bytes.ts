/**
 * Compare two byte arrays
 */
export function compare(a: Uint8Array, b: Uint8Array): boolean {
  return a.length == b.length && a.every((val, idx) => val == b[idx]);
}

/**
 * Concatenate two byte arrays
 */
export function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  return new Uint8Array([...a, ...b]);
}
