import { stringify, parse } from './hex'
import { createHash } from 'crypto'

/**
 * Proof operator
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
  commit (input: Uint8Array): Promise<Uint8Array>
}

/**
 * Data insertion operation
 * @param prepend - Prepend data when true, append when false
 */
export const insert = (prepend: boolean, data: string): Operation => {
  
  const hex = parse(data)

  // Validate data
  if (!hex)
    throw new Error(`${ prepend ? 'Prepend' : 'Append' } operation has no data`)
  
  return {
    toString: () => (prepend ? 'Prepend' : 'Append') + ' ' + stringify(hex),
    toJSON: () => [ prepend ? 'prepend' : 'append' , stringify(hex) ],
    commit: async (input: Uint8Array) => new Uint8Array(
      prepend
        ? [ ...hex, ...input ]
        : [ ...input, ...hex ]
    )
  }
}

/**
 * SHA-256 commitment operation 
 */
export const sha256 = (): Operation => ({
  toString: () => 'SHA-256',
  toJSON: () => [ 'sha-256' ],
  commit: async (input: Uint8Array) => createHash('SHA256')
    .update(input)
    .digest()
})
