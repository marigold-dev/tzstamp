import { Operation } from './operation'
import { Prepend } from './operations/prepend'
import { Append } from './operations/append'
import { SHA256 } from './operations/sha256'

/**
 * JSON serialization
 */
type ProofSerialization = {
  version: number,
  ops: string[][]
}

/**
 * Proof constructor options
 */
type ProofOptions = {
  operations: Operation[]
}

/**
 * Cryptographic proof
 */
export class Proof {

  /**
   * Proof serialization format version
   */
  static readonly VERSION = 0

  /**
   * Deserialize a JSON proof
   */
  static parse (json: string): Proof {

    // Parse JSON
    const { version, ops }: ProofSerialization = JSON.parse(json)

    // Validate version
    if (
      typeof version != 'number' ||
      !Number.isInteger(version) ||
      version < 0
    ) throw new Error(`Invalid proof version "${version}"`)

    // Handle supported versions
    switch (version) {
      case 0:

        // Runtime assertians validation
        if (!Array.isArray(ops))
          throw new Error('Invalid operations list')

        // Map operations
        const operations = ops.map(op => {
          const [ id, ...argv ] = op
          switch (id) {
            case Prepend.ID: return new Prepend(...argv)
            case Append.ID: return new Append(...argv)
            case SHA256.ID: return new SHA256(...argv)
            default: throw new Error(`Unsupported operation id "${id}"`)
          }
        })

        return new Proof({ operations })

      default:
        throw new Error(`Unsupported proof version "${version}"`)
    }
  }

  /**
   * Commitment operations
   */
  readonly operations: Operation[]

  constructor ({ operations }: ProofOptions) {
    this.operations = operations
  }

  /**
   * JSON serializer
   */
  toJSON (): Object {
    return {
      version: Proof.VERSION,
      ops: this.operations
    }
  }

  /**
   * Derive value from all operations
   */
  async derive (input: Uint8Array): Promise<Uint8Array> {
    let value = input
    for (const operation of this.operations) {
      value = await operation.commit(value)
    }
    return value
  }
}
