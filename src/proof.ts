import { Operation, insert, sha256 } from './operation'

/**
 * Proof constructor options
 */
interface ProofOptions {
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
    const data: any = JSON.parse(json)

    // Validate data root
    if (
      typeof data != 'object' ||
      data == null
    ) throw new Error(`Invalid proof format`)

    // Validate version
    if (
      typeof data.version != 'number' ||
      !Number.isInteger(data.version) ||
      data.version < 0
    ) throw new Error(`Invalid proof version "${data.version}"`)

    // Handle supported versions
    switch (data.version) {
      
      case 0:

        // Validate operations list
        if (!Array.isArray(data.ops))
          throw new Error('Invalid operations list')

        // Map operations
        const operations = data.ops.map(op => {
          
          // Validate operation
          if (!Array.isArray(op))
            throw new Error(`Invalid operation "${JSON.stringify(op)}"`)
          
          switch (op[0]) {
            case 'prepend': return insert(true, op[1])
            case 'append': return insert(false, op[1])
            case 'sha-256': return sha256()
            default: throw new Error(`Unsupported operation type "${op[0]}"`)
          }
        })

        return new Proof({ operations })

      // Unsupported version
      default:
        throw new Error(`Unsupported proof version "${data.version}"`)
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
    return this.operations.reduce(
      async (current, operation) => operation.commit(await current),
      Promise.resolve(input)
    )
  }
}
