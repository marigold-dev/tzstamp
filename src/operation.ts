import { stringify, parse } from './hex'
import { createHash } from 'crypto'
import { concat } from './bytes'
import { blake2b as blake2bHash } from './blake2b'

/**
 * Proof operation
 */
export interface Operation {

  /**
   * Represent operation as a user friendly string
   */
  toString(): string

  /**
   * JSON serializer
   */
  toJSON (): string[]

  /**
   * Commit operation to input
   */
  commit (input: Uint8Array): Uint8Array
}

export namespace Operation {

  /**
   * Prepend operation
   */
  export const prepend = (data: Uint8Array) => ({
    toString: () => `Prepend ${stringify(data)}`,
    toJSON: () => [ 'prepend', stringify(data) ],
    commit: (input: Uint8Array) => concat(data, input)
  })

  /**
   * Append operation
   */
  export const append = (data: Uint8Array) => ({
    toString: () => `Append ${stringify(data)}`,
    toJSON: () => [ 'append', stringify(data) ],
    commit: (input: Uint8Array) => concat(input, data)
  })

  /**
   * SHA-256 hash operation
   */
  export const sha256 = (): Operation => ({
    toString: () => 'SHA-256',
    toJSON: () => [ 'sha-256' ],
    commit: (input: Uint8Array) => createHash('SHA256')
      .update(input)
      .digest()
  })

  /**
   * Blake2b-256 hash operation
   */
  export const blake2b = (): Operation => ({
    toString: () => 'Blake2b-256',
    toJSON: () => [ 'blake2b' ],
    commit: (input: Uint8Array) => blake2bHash(input)
  })
}
