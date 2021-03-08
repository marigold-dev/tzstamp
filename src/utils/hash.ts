import { createHash } from 'crypto'

/**
 * Produce SHA-256 digest
 */
export const sha256 = (data: Uint8Array): Promise<Uint8Array> => Promise.resolve(
  new Uint8Array (
    createHash('SHA256')
      .update(data)
      .digest()
  )
)
