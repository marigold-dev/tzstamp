import { Operation } from './operation'
import { Block } from './block'
import * as Bytes from './bytes'
import * as Hex from './hex'
import * as Base58 from './base58'

/**
 * Network ID prefix
 */
const NETWORK_PREFIX = new Uint8Array([ 87, 82, 0 ]) // Net(15)

/**
 * JSON operation deserializer
 */
function toOperation (op: any): Operation {
  if (!Array.isArray(op) || !op.length)
    throw new Error(`Invalid operation`)
  const id = op[0]
  switch (op[0]) {
    case 'prepend': {
      const data = Hex.parse(op[1])
      return Operation.prepend(data)
    }
    case 'append': {
      const data = Hex.parse(op[1])
      return Operation.append(data)
    }
    case 'sha-256':
      return Operation.sha256()
    case 'blake2b':
      return Operation.blake2b()
    default:
      throw new Error(`Unsupported operation "${id}"`)
  }
}

/**
 * Cryptographic proof-of-inclusion
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
    const data: any = JSON.parse(json)
    if (typeof data != 'object' || data == null)
      throw new Error('Invalid proof format')
    const { version, network, ops } = data
    // Proof version 0 is unstable and subject to breaking changes
    // Support for version 0 will be dropped on 1.0.0 release
    if (typeof version != 'number' || !Number.isInteger(version) || version < 0)
      throw new Error('Invalid proof version')
    if (version > Proof.VERSION)
      throw new Error(`Unsupported proof version "${version}"`)
    return new Proof(network, ops.map(toOperation))
  }

  /**
   * Tezos network
   */
  readonly network: string

  /**
   * Proof operations
   */
  readonly operations: Operation[]

  constructor (network: string, operations: Operation[]) {

    // Validate network ID
    try {
      const rawNetwork = Base58.decodeCheck(network)
      if (rawNetwork.length != 7)
        throw null
      if (!Bytes.compare(rawNetwork.slice(0, 3), NETWORK_PREFIX))
        throw null
    } catch (_) {
      throw new Error('Invalid network ID')
    }

    this.network = network
    this.operations = operations
  }

  /**
   * JSON serializer
   */
  toJSON (): Object {
    return {
      version: Proof.VERSION,
      network: this.network,
      ops: this.operations
    }
  }

  /**
   * Derive block hash from operations
   */
  derive (input: Uint8Array): Block {
    const rawHash = this.operations.reduce((acc, op) => op.commit(acc), input)
    return new Block(this.network, rawHash)
  }
}
