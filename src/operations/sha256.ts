import { Operation } from '../operation'
import { sha256 } from '../utils/hash'

/**
 * SHA-256 hash operation
 */
export class SHA256 extends Operation {

  static readonly ID = 'sha-256'

  public toString () {
    return 'SHA-256'
  }

  public toJSON () {
    return [ SHA256.ID ]
  }

  public async commit (input: Uint8Array) {
    return await sha256(input)
  }
}