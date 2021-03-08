/**
 * Commitment operator
 */
export abstract class Operation {

  /**
   * Serialization ID
   */
  static readonly ID: string

  constructor (...argv: string[]) {}

  /**
   * Represent operation as a user friendly string
   */
  public abstract toString (): string

  /**
   * JSON serializer
   */
  public abstract toJSON (): string[]

  /**
   * Commit operation to input
   */
  public abstract commit (input: Uint8Array): Promise<Uint8Array>
}
