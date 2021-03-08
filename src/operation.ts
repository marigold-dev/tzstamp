/**
 * Commitment operator
 */
namespace Operation {
  export { Prepend } from './operations/prepend'
  export { Append } from './operations/append'
  export { SHA256 } from './operations/sha256'
}

export interface Operation {

  /**
   * Serialization ID
   */
  static ID: string

  constructor (...argv: string[]): Operation

  /**
   * Represent operation as a user friendly string
   */
  public toString (): string

  /**
   * JSON serializer
   */
  public toJSON (): string[]

  /**
   * Commit operation to input
   */
  public commit (input: Uint8Array): Promise<Uint8Array>
}

