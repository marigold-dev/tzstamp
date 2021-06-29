import { Operation, OperationTemplate } from "./operation.ts";
import { Base58, compare, Hex } from "./deps.ts";
import {
  affixedProofSchema,
  blockHeaderSchema,
  isValid,
  proofSchema,
  unresolvedProofSchema,
} from "./schemas.ts";
import {
  FetchError,
  InvalidTezosNetworkError,
  MismatchedHashError,
  UnsupportedVersionError,
} from "./errors.ts";

/**
 * Tezos network identifier prefix bytes
 */
const NETWORK_PREFIX = new Uint8Array([87, 82, 0]);

/**
 * Tezos block hash prefix bytes
 */
const BLOCK_PREFIX = new Uint8Array([1, 52]);

/**
 * Tezos Mainnet network identifier
 */
const TEZOS_MAINNET = "NetXdQprcVkpaWU";

type AnyProofTemplate =
  | ProofTemplate
  | AffixedProofTemplate
  | UnresolvedProofTemplate;

type AnyProofOptions =
  | ProofOptions
  | AffixedProofOptions
  | UnresolvedProofOptions;

type AnyProof =
  | Proof
  | AffixedProof
  | UnresolvedProof;

/**
 * Proof template
 */
export interface ProofTemplate {
  version: number;
  hash: string;
  operations: OperationTemplate[];
}

/**
 * Proof constructor options
 */
export interface ProofOptions {
  hash: Uint8Array;
  operations: Operation[];
}

/**
 * Cryptographic timestamp proof
 */
export class Proof {
  /**
   * Input hash
   */
  readonly hash: Uint8Array;

  /**
   * Proof operations
   */
  readonly operations: Operation[];

  /**
   * Output of all operations applied sequentially to the input hash
   */
  readonly derivation: Uint8Array;

  constructor({ hash, operations }: ProofOptions) {
    this.hash = hash;
    this.operations = operations;
    this.derivation = operations.reduce(
      (input, operation) => operation.commit(input),
      hash,
    );
  }

  /**
   * Narrows the proof to the affixed subclass.
   */
  isAffixed(): this is AffixedProof {
    return false;
  }

  /**
   * Narrows the proof to the unresolved subclass.
   */
  isUnresolved(): this is UnresolvedProof {
    return false;
  }

  /**
   * Concatenates another proof's operations to the current one.
   * Throws `MismatchedHashError` if the derivation of the current proof does not match
   * the stored hash of the passed proof.
   *
   * ```js
   * const proofA = Proof.create({ ... });
   * const proofB = Proof.create({ ... });
   * const proofAB = proofA.concat(proofB);
   * // Hash of proofA
   * // Operations of proofA + proofB
   * // Calculates new derivation
   * ```
   *
   * The `AffixedProof` and `UnresolvedProof` subclasses are viral.
   * Concatenating to instances of these classes will produce a new
   * instance of the same subclass:
   *
   * ```js
   * const affixedProof = new AffixedProof({ ... });
   * proof.concat(affixedProof);
   * // AffixedProof {}
   * // Retains extra fields of affixedProof
   *
   * const unresolvedProof = new UnresolvedProof({ ... });
   * proof.concat(unresolvedProof);
   * // UnresolvedProof {}
   * // Retains extra fields of unresolvedProof
   * ```
   *
   * The `AffixedProof` subclass represents the end of a proof
   * and cannot be concatenated to:
   *
   * ```js
   * affixedProof.concat(proof);
   * // TypeError: Cannot concatenate to an affixed proof
   * ```
   *
   * @param proof Proof to append
   */
  concat(proof: AffixedProof): AffixedProof;
  concat(proof: UnresolvedProof): UnresolvedProof;
  concat(proof: Proof): Proof;
  concat(proof: AnyProof) {
    if (!compare(this.derivation, proof.hash)) {
      throw new MismatchedHashError(
        "Derivation of current proof does not match the stored hash of the appended proof",
      );
    }
    const baseOptions: ProofOptions = {
      hash: this.hash,
      operations: this.operations.concat(proof.operations),
    };
    if (proof.isAffixed()) {
      return new AffixedProof({
        ...baseOptions,
        network: proof.network,
        timestamp: proof.timestamp,
      });
    }
    if (proof.isUnresolved()) {
      return new UnresolvedProof({
        ...baseOptions,
        remote: proof.remote,
      });
    }
    return new Proof(baseOptions);
  }

  /**
   * Converts the proof to a JSON-serializable template.
   *
   * ```js
   * JSON.stringify(myProof);
   * // `myProof.toJSON` is called implicitly
   * ```
   */
  toJSON(): ProofTemplate {
    return {
      version: 1,
      hash: Hex.stringify(this.hash),
      operations: this.operations.map((operation) => operation.toJSON()),
    };
  }

  /**
   * Creates an automatically subclassed proof.
   *
   * ```js
   * Proof.create({
   *   hash: ...,
   *   operations: [...],
   *   remote: "...",
   * });
   * // UnresolvedProof{}
   * ```
   *
   * @param options Proof constructor options
   */
  static create(options: AffixedProofOptions): AffixedProof;
  static create(options: UnresolvedProofOptions): UnresolvedProof;
  static create(options: ProofOptions): Proof;
  static create(options: AnyProofOptions) {
    if ("network" in options) {
      return new AffixedProof(options);
    }
    if ("remote" in options) {
      return new UnresolvedProof(options);
    }
    return new Proof(options);
  }

  /**
   * Creates a proof from a template object.
   *
   * Throws `SyntaxError` if the template is invalid.
   *
   * Throws `UnsupportedVersionError` if the template version
   * is unsupported.
   *
   * ```js
   * Proof.from({
   *   version: 1,
   *   hash: "...":
   *   operations: [...]
   * });
   * // Proof {}
   * ```
   *
   * @param template Template object
   */
  static from(template: unknown): Proof {
    if (!isValid<AnyProofTemplate>(proofSchema, template)) {
      throw new SyntaxError("Invalid proof template");
    }
    if (template.version != 1) {
      throw new UnsupportedVersionError(
        template.version,
        `Unsupported proof version "${template.version}"`,
      );
    }
    const baseOptions: ProofOptions = {
      hash: Hex.parse(template.hash),
      operations: template.operations.map(Operation.from),
    };
    if (isValid<AffixedProofTemplate>(affixedProofSchema, template)) {
      return new AffixedProof({
        ...baseOptions,
        network: template.network,
        timestamp: new Date(template.timestamp),
      });
    }
    if (isValid<UnresolvedProofTemplate>(unresolvedProofSchema, template)) {
      return new UnresolvedProof({
        ...baseOptions,
        remote: template.remote,
      });
    }
    return new Proof(baseOptions);
  }
}

/**
 * Verification status
 */
export enum VerifyStatus {
  /**
   * Proof is successfully verified. The stored
   * input hash existed by the stored timestamp.
   */
  Verified = "verified",

  /**
   * Proof could not be verified. The Tezos node
   * could not find the block at the affixed address.
   */
  NotFound = "notFound",

  /**
   * Proof could not be verified. The asserted timestamp
   * does not match the on-chain timestamp. The
   * proof has been modified, perhaps maliciously.
   */
  Mismatch = "mismatch",
}

/**
 * Verification result
 */
export interface VerifyResult {
  verified: boolean;
  status: VerifyStatus;
  message: string;
}

interface BlockHeader {
  timestamp: string;
}

/**
 * Affixed proof template
 */
export interface AffixedProofTemplate extends ProofTemplate {
  network: string;
  timestamp: string;
}

/**
 * Affixed proof constructor options
 */
export interface AffixedProofOptions extends ProofOptions {
  network: string;
  timestamp: Date;
}

/**
 * Cryptographic timestamp proof affixed to the Tezos blockchain
 */
export class AffixedProof extends Proof {
  /**
   * Tezos network identifier
   */
  readonly network: string;

  /**
   * Timestamp asserted by the proof
   */
  readonly timestamp: Date;

  /**
   * Indicates that the proof is affixed to the Tezos mainnet
   */
  readonly mainnet: boolean;

  /**
   * Base58 encoded Tezos block hash
   */
  readonly blockHash: string;

  /**
   * Throws `InvalidTezosNetworkError` if the Tezos network identifier is invalid.
   *
   * @param hash Input hash
   * @param operations Proof operations
   * @param network Tezos network identifier
   * @param timestamp Asserted timestamp
   */
  constructor({
    hash,
    operations,
    network,
    timestamp,
  }: AffixedProofOptions) {
    super({ hash, operations });
    try {
      const rawNetwork = Base58.decodeCheck(network, NETWORK_PREFIX);
      if (rawNetwork.length != 4) throw null;
    } catch (_) {
      throw new InvalidTezosNetworkError(
        `Invalid Tezos network "${network}"`,
      );
    }
    this.network = network;
    this.timestamp = timestamp;
    this.mainnet = network == TEZOS_MAINNET;
    this.blockHash = Base58.encodeCheck(this.derivation, BLOCK_PREFIX);
  }

  isAffixed(): this is AffixedProof {
    return true;
  }

  concat(_: AnyProof): never {
    throw new TypeError("Cannot concatenate to an affixed proof");
  }

  /**
   * Verifies the proof by querying Tezos node RPC with the derived
   * block hash and comparing the timestamp of the block header with
   * the timestamp asserted by the proof.
   *
   * Throws `TypeError` if the RPC URL is invalid or a network error
   * is encountered.
   *
   * Throws `FetchError` if the response has a status other than
   * 200 or 404.
   *
   * Throws `SyntaxError` if the fetched block header is not valid JSON
   * or does not contain a valid timestamp field.
   *
   * Resolves a `VerifyResult` containing a explanatory message of
   * verification success or fail.
   *
   * @param rpcURL Tezos node RPC base URL
   */
  async verify(rpcURL: string): Promise<VerifyResult> {
    const endpoint = new URL(
      `chains/${this.network}/blocks/${this.blockHash}/header`,
      rpcURL,
    ).toString();
    const controller = new AbortController();
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        accept: "application/json",
      },
    });
    switch (response.status) {
      case 200:
        break;
      case 404:
        controller.abort();
        return {
          verified: false,
          status: VerifyStatus.NotFound,
          message: "Derived block could not be found",
        };
      default:
        controller.abort();
        throw new FetchError(response.status, response.statusText);
    }
    try {
      const header = await response.json();
      if (!isValid<BlockHeader>(blockHeaderSchema, header)) throw null;
      const timestamp = new Date(header.timestamp);
      if (timestamp.getTime() != this.timestamp.getTime()) {
        return {
          verified: false,
          status: VerifyStatus.Mismatch,
          message: "Local timestamp differs from the on-chain timestamp",
        };
      }
      return {
        verified: true,
        status: VerifyStatus.Verified,
        message: "Verified proof",
      };
    } catch (_) {
      throw new SyntaxError("Invalid block header");
    }
  }

  toJSON(): AffixedProofTemplate {
    return {
      ...super.toJSON(),
      network: this.network,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

/**
 * Unresolved proof options
 */
export interface UnresolvedProofOptions extends ProofOptions {
  remote: string;
}

/**
 * Unresolved proof template
 */
export interface UnresolvedProofTemplate extends ProofTemplate {
  remote: string;
}

/**
 * Proof segment awaiting remote proof
 */
export class UnresolvedProof extends Proof {
  /**
   * Remote proof URL
   */
  readonly remote: string;

  /**
   * @param hash Input hash
   * @param operations Proof operations
   * @param remote Remote proof URL
   */
  constructor({ hash, operations, remote }: UnresolvedProofOptions) {
    super({ hash, operations });
    this.remote = remote;
  }

  isUnresolved(): this is UnresolvedProof {
    return true;
  }

  /**
   * Tries to fetch and concatenate the remote proof.
   *
   * Throws if a network connection cannot be established.
   *
   * Throws `FetchError` if the request response status was not 200.
   *
   * Throws `SyntaxError` if the response body is not JSON.
   *
   * Throws `MismatchedHashError` if the derivation of the current
   * proof differs from the input hash of the resolved proof.
   *
   * ```js
   * await unresolvedProof.resolve();
   * // AffixedProof { ... }
   * ```
   */
  async resolve(): Promise<Proof> {
    const controller = new AbortController();
    const response = await fetch(this.remote, {
      signal: controller.signal,
      headers: {
        accept: "application/json",
      },
    });
    if (!response.ok) {
      controller.abort();
      throw new FetchError(
        response.status,
        response.statusText,
      );
    }
    try {
      const template = await response.json();
      const proof = Proof.from(template);
      return this.concat(proof);
    } catch (_) {
      throw new SyntaxError("Invalid remote proof template");
    }
  }

  toJSON(): UnresolvedProofTemplate {
    return {
      ...super.toJSON(),
      remote: this.remote.toString(),
    };
  }
}
