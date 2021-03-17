import { Operation } from './operation'
import { parse } from './hex'
import { validateChain, ValidationResult } from '@taquito/utils'
import fetch from 'node-fetch'

/**
 * Proof constructor options
 */
export interface ProofOptions {
  operations: Operation[],
  chainID: string,
  blockHash: string,
  operationHash: string
}

/**
 * Verification result statuses
 */
export enum VerificationStatus {
  SERVER_ERROR = "SERVER_ERROR",
  BAD_SOURCE = "BAD_SOURCE",
  DIFFERENT_ROOT = "DIFFERENT_ROOT",
  VERIFIED = "VERIFIED"
}

/**
 * Result of attempted verification from on-chain record
 */
export interface VerificationResult {
  status: VerificationStatus,
  root: Uint8Array,
  publishedRoot?: Uint8Array
  timestamp?: Date
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

    // Parse JSON
    const data: any = JSON.parse(json)

    // Validate proof data
    if (!isObject(data))
      throw new Error(`Invalid proof format`)
    if (!isValidVersion(data.version))
      throw new Error(`Invalid proof version "${data.version}"`)
    if (data.version > Proof.VERSION)
      throw new Error(`Unsupported proof version "${data.version}"`)

    // Parse record reference
    if (!Array.isArray(data.record))
      throw new Error('Invalid record reference')
    const [ chainID, blockHash, operationHash ] = data.record
    if (validateChain(chainID) != ValidationResult.VALID)
      throw new Error(`Invalid chain ID "${chainID}"`)
    if (!isValidBlockHash(blockHash))
      throw new Error(`Invalid block hash "${blockHash}"`)
    if (!isValidOperationHash(operationHash))
      throw new Error(`Invalid operation hash "${operationHash}"`)

    // Parse operations list
    if (!Array.isArray(data.ops))
      throw new Error('Invalid operations list')
    const operations = data.ops.map(toOperations)

    return new Proof({ operations, chainID, blockHash, operationHash })
  }

  /**
   * Commitment operations
   */
  readonly operations: Operation[]

  /**
   * Tezos chain ID
   */
  readonly chainID: string

  /**
   * Tezos block hash
   */
  readonly blockHash: string

  /**
   * Tezos operation hash
   */
  readonly operationHash: string

  constructor ({ operations, chainID, blockHash, operationHash }: ProofOptions) {
    // TODO: validate notary references
    this.operations = operations
    this.chainID = chainID
    this.blockHash = blockHash
    this.operationHash = operationHash
  }

  /**
   * JSON serializer
   */
  toJSON (): Object {
    return {
      version: Proof.VERSION,
      ops: this.operations,
      record: [ this.chainID, this.blockHash, this.operationHash ]
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

  /**
   * Verify derived value against on-chain record
   */
  async verify (input: Uint8Array, rpcURL: string | URL): Promise<VerificationResult> {
    
    const root = await this.derive(input)
    
    // Fetch block data
    const blockEndpoint = new URL(`/chains/${this.chainID}/blocks/${this.blockHash}`, rpcURL)
    const blockResponse = await fetch(blockEndpoint)
    
    // Bad response status
    if (!blockResponse.ok) {
      if (blockResponse.status == 400)
        return { status: VerificationStatus.BAD_SOURCE, root }
      else
        return { status: VerificationStatus.SERVER_ERROR, root }
    }

    const block = await blockResponse.json()
    const timestamp = new Date(block.header.timestamp)
    
    // Find operation
    const operation = block.operations
      .flat()
      .find(op => op.hash == this.operationHash)
    if (!operation)
      return { status: VerificationStatus.BAD_SOURCE, root }
    const publishedHex = operation
      ?.contents
      .find(c => c.kind == 'transaction')
      ?.parameters
      ?.value
      ?.bytes
    if (typeof publishedHex != 'string')
      return { status: VerificationStatus.BAD_SOURCE, root }
    try {
      const publishedRoot = parse(publishedHex)
      if (!compare(root, publishedRoot))
        return { status: VerificationStatus.DIFFERENT_ROOT, root, publishedRoot }
      return { status: VerificationStatus.VERIFIED, root, timestamp, publishedRoot }
    } catch (parseError) {
      return { status: VerificationStatus.BAD_SOURCE, root } 
    }
  }
}

/**
 * Determine if a value is a valid proof version
 */
const isValidVersion = (value: any): boolean =>
  typeof value == 'number' &&
  Number.isInteger(value) &&
  value >= 0

/**
 * Determine if a value is a non-function object
 */
const isObject = (value: any): boolean =>
  typeof value == 'object' &&
  value != null

/**
 * Determine if a value is a valid tezos block hash
 */
const isValidBlockHash = (value: any): boolean =>
  typeof value == 'string'

/**
 * Determine if a value is a valid tezos operation hash
 */
const isValidOperationHash = (value: any): boolean =>
  typeof value == 'string'

/**
 * JSON operation deserializer
 */
const toOperations = (op: any) => {

  // Validate operation
  if (!Array.isArray(op))
    throw new Error(`Invalid operation "${JSON.stringify(op)}"`)
  if (!op.length)
    throw new Error('Empty operation')

  // Revive operations
  const id = op[0]
  switch (op[0]) {
    case 'prepend': return Operation.prepend(parse(op[1]))
    case 'append': return Operation.append(parse(op[1]))
    case 'sha-256': return Operation.sha256()
    default: throw new Error(`Unsupported operation "${id}"`)
  }
}

/**
 * Compare two byte arrays
 */
const compare = (a: Uint8Array, b: Uint8Array): boolean =>
  a.length == b.length &&
  a.every((val, idx) => val == b[idx])
