/**
 * Concatenate a list of byte arrays
 * @param  {...number|Uint8Array} chunks Individual bytes or byte arrays
 */
exports.concatAll = function (...chunks) {
  let size = 0
  for (const piece of chunks) {
    if (typeof piece == 'number') {
      size++
    } else if (piece instanceof Uint8Array) {
      size += piece.length
    } else {
      throw new Error('Cannot concatenate bad input')
    }
  }
  const result = new Uint8Array(size)
  let cursor = 0
  for (const piece of chunks) {
    if (typeof piece == 'number') {
      result[cursor] = piece
      cursor++
    } else {
      for (const byte of piece) {
        result[cursor] = byte
        cursor++
      }
    }
  }
  return result
}
