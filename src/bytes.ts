/**
 * Compare two byte arrays
 */
export function compare(a: Uint8Array, b: Uint8Array): boolean {
  return a.length == b.length && a.every((val, idx) => val == b[idx]);
}

/**
 * Concatenate a list of bytes or byte arrays
 *
 * @param  {...number|Uint8Array} chunks Individual bytes or byte arrays
 *
 * Numbers larger than 255 or smaller than 0 will wrap around.
 */
export function concat(...chunks: (number | Uint8Array)[]): Uint8Array {
  // Calculate size of resulting array
  let size = 0;
  for (const piece of chunks) {
    size += piece instanceof Uint8Array ? piece.length : 1;
  }

  // Populate resulting array
  const result = new Uint8Array(size);
  let cursor = 0;
  for (const piece of chunks) {
    if (piece instanceof Uint8Array) {
      result.set(piece, cursor);
      cursor += piece.length;
    } else {
      // Piece is number
      result[cursor] = piece;
      cursor++;
    }
  }

  return result;
}
