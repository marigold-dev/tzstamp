import { stringify, parse } from './hex'
import { createHash } from 'crypto'
import { concat } from './bytes'

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
}
