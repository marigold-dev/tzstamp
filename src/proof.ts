import { Operation } from './operation'
import { Block } from './block'
import { compare, Hex, Base58 } from '@tzstamp/helpers'

/**
 * Network ID prefix
 *
 * @see {@link https://gitlab.com/tezos/tezos/-/blob/master/src/lib_crypto/base58.ml#L424|base58.ml}
 * for details
 */
const NETWORK_PREFIX = new Uint8Array([ 87, 82, 0 ]) // Net(15)

/**
 * JSON operation deserializer
 */
function toOperation (op: any): Operation {
  if (!Array.isArray(op) || op.length == 0) {
    throw new Error(`Invalid operations array`)
  }
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
      throw new Error(`Unsupported operation "${op[0]}"`)
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
    if (version == null) {
      throw new Error('Missing proof version')
    }
    if (network == null) {
      throw new Error('Missing network ID')
    }
    if (ops == null) {
      throw new Error('Missing operations array')
    }
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

    // Empty operations array
    if (operations.length == 0) {
      throw new Error('Empty operations array')
    }

    // Validate network ID
    try {
      const rawNetwork = Base58.decodeCheck(network)
      if (rawNetwork.length != 7)
        throw null
      if (!compare(rawNetwork.slice(0, 3), NETWORK_PREFIX))
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
