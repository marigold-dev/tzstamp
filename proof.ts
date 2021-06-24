import { Operation, OperationTemplate } from "./operation.ts";
import { Base58, compare, concat, Hex } from "./deps.ts";
import { isValid, Schema } from "./_validate.ts";
import {
  FetchError,
  InvalidTemplateError,
  InvalidTezosNetworkError,
  MismatchedHashError,
  UnsupportedVersionError,
} from "./errors.ts";

/**
 * Proof template
 */
export interface ProofTemplate {
  version: number;
  hash: string;
  operations: OperationTemplate[];
  [_: string]: unknown;
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
   * Output of all operations applied sequentially to the input hash.
   */
  readonly derivation: Uint8Array;

  /**
   * @param hash Input hash
   * @param operations Proof operations
   */
  constructor({ hash, operations }: ProofOptions) {
    this.hash = hash;
    this.operations = operations;
    this.derivation = operations.reduce(
      (input, operation) => operation.commit(input),
      hash,
    );
  }

  /**
   * Concatenates another proof's operations to the current one.
   * Throws `MismatchedHashError` if the derivation of the current proof does not match
   * the stored hash of the passed proof.
   *
   * ```ts
   * const proofA = new Proof({ ... });
   * const proofB = new Proof({ ... });
   * const proofAB = proofA.concat(proofB);
   * // Hash of proofA
   * // Operations of proofA + proofB
   * // Calculates new derivation
   * ```
   *
   * The `AffixedProof` and `PendingProof` subclasses are viral.
   * Concatenating to instances of these classes with produce a new
   * instance of the same subclass:
   *
   * ```ts
   * const affixedProof = new AffixedProof({ ... });
   * proof.concat(affixedProof);
   * // AffixedProof {}
   * // Retains extra fields of affixedProof
   *
   * const pendingProof = new PendingProof({ ... });
   * proof.concat(pendingProof);
   * // PendingProof {}
   * // Retains extra fields of pendingProof
   * ```
   *
   * The `AffixedProof` class represents the end of a proof
   * and cannot be concatenated to:
   *
   * ```
   * affixedProof.concat(proof);
   * // TypeError: Cannot concatenate to an affixed proof
   * ```
   *
   * @param proof Proof to append
   */
  concat(proof: AffixedProof): AffixedProof;
  concat(proof: PendingProof): PendingProof;
  concat(proof: Proof): Proof;
  concat(proof: Proof): Proof {
    if (this instanceof AffixedProof) {
      throw new TypeError("Cannot concatenate to an affixed proof");
    }
    if (!compare(this.derivation, proof.hash)) {
      throw new MismatchedHashError(
        "Derivation of partial proof does not match the stored hash of the appended proof",
      );
    }
    const hash = this.hash;
    const operations = this.operations.concat(proof.operations);
    if (proof instanceof AffixedProof) {
      return new AffixedProof({
        hash,
        operations,
        network: proof.network,
        timestamp: proof.timestamp,
      });
    }
    if (proof instanceof PendingProof) {
      return new PendingProof({
        hash,
        operations,
        remote: proof.remote,
      });
    }
    return new Proof({ hash, operations });
  }

  /**
   * Converts the proof to a JSON-serializable template.
   *
   * ```ts
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
   * [JTD] schema for a proof template
   *
   * [JTD]: https://jsontypedef.com
   */
  static readonly schema: Schema = {
    properties: {
      version: { type: "uint32" },
      hash: { type: "string" },
      operations: {
        elements: Operation.schema,
      },
    },
    additionalProperties: true,
  };

  /**
   * Creates a proof from a template object.
   * Throws `InvalidTemplateError` if the template is invalid.
   * Throws `UnsupportedVersionError` if the template version is unsupported.
   *
   * ```ts
   * Proof.from({
   *   version: 1,
   *   hash: "...":
   *   operations: [...]
   * });
   * // Proof { hash: Uint8Array {...}, operations: [...] }
   * ```
   *
   * @param template Template object
   */
  static from(template: unknown): Proof {
    if (!isValid<ProofTemplate>(Proof.schema, template)) {
      throw new InvalidTemplateError("Invalid proof template");
    }
    const supported = [1];
    if (!supported.includes(template.version)) {
      throw new UnsupportedVersionError(
        template.version,
        `Unsupported proof version "${template.version}"`,
      );
    }
    if (!Hex.validator.test(template.hash)) {
      throw new SyntaxError("Invalid input hash");
    }
    const baseOptions: ProofOptions = {
      hash: Hex.parse(template.hash),
      operations: template.operations.map(Operation.from),
    };
    if (isValid<AffixedProofTemplate>(AffixedProof.schema, template)) {
      return new AffixedProof({
        ...baseOptions,
        network: template.network,
        timestamp: new Date(template.timestamp),
      });
    }
    if (isValid<PendingProofTemplate>(PendingProof.schema, template)) {
      return new PendingProof({
        ...baseOptions,
        remote: template.remote,
      });
    }
    return new Proof(baseOptions);
  }
}

/**
 * Verification status of a proof
 */
export enum VerifyStatus {
  /**
   * Proof is successfully verified. The stored
   * input hash existed by the stored timestamp.
   */
  Verified = "verified",

  /**
   * Proof could not be verified. A connection could
   * not be established to the The Tezos node, or
   * the server responses were wrong.
   */
  NetError = "netError",

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
 * Affixed proof constructor options
 */
export interface AffixedProofOptions extends ProofOptions {
  network: string;
  timestamp: Date;
}

/**
 * Affixed proof template
 */
export interface AffixedProofTemplate extends ProofTemplate {
  network: string;
  timestamp: string;
}

/**
 * Tezos network identifier prefix bytes
 *
 * When encoded in [Base58], it renders as the characters "Net" with carry of 15.
 * See [base58.ml] for details.
 *
 * [Base58]: https://tools.ietf.org/id/draft-msporny-base58-01.html
 * [base58.ml]: https://gitlab.com/tezos/tezos/-/blob/master/src/lib_crypto/base58.ml#L424
 */
const NETWORK_PREFIX = new Uint8Array([87, 82, 0]);

/**
 * Tezos Mainnet network identifier
 */
const TEZOS_MAINNET = "NetXdQprcVkpaWU";

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
   * Tezos Base-58 encoded block hash
   */
  get blockHash(): string {
    return Base58.encodeCheck(
      concat(1, 52, this.derivation), // Tezos block hash prefix is \001\052
    );
  }

  /**
   * Throws `InvalidTezosNetworkError` if the Tezos network identifier is invalid.
   *
   * @param hash Input hash
   * @param operations Proof operations
   * @param network Tezos network identifier
   * @param timestamp Asserted timestamp
   */
  constructor({ hash, operations, network, timestamp }: AffixedProofOptions) {
    super({ hash, operations });
    try {
      const rawNetwork = Base58.decodeCheck(network);
      if (rawNetwork.length != 7) throw null;
      if (!compare(rawNetwork.slice(0, 3), NETWORK_PREFIX)) throw null;
    } catch (_) {
      throw new InvalidTezosNetworkError(`Invalid Tezos network "${network}"`);
    }
    this.network = network;
    this.timestamp = timestamp;
  }

  /**
   * Checks if the proof is affixed to the Tezos Mainnet.
   * If `false`, the proof is affixed to an alternate network
   * and may not be trustworthy.
   */
  get mainnet(): boolean {
    return this.network == TEZOS_MAINNET;
  }

  /**
   * Verifies the proof by querying Tezos node RPC with the derived
   * block hash and comparing the timestamp of the block header with
   * the timestamp asserted by the proof.
   *
   * Throws `TypeError` if the RPC URL is invalid.
   *
   * Resolves to `VerifyStatus.NotFound` if the node responds with a 404
   * while querying the block header. Probable causes are:
   *
   * 1. The RPC URL provided does not refer to a Tezos node.
   * 2. The node does not support the asserted network.
   * 3. The proof has been tampered with or was constructed incorrectly.
   * 4. The node is operating in rolling history mode.
   *
   * Resolves to `VerifyStatus.NetError` if a connection could not be established,
   * the server responds with a status other than 200 or 404, or the response was
   * not JSON. Probable causes are:
   *
   * 1. The RPC URL provided does not refer to a Tezos node.
   * 2. Network access is unavailable or blocked by the runtime or operating system.
   * 3. The client is not authorized to access the node.
   * 4. The node is under strain or temporarily down.
   *
   * Resolves to `VerifyStatus.Mismatch` if the block header is successfully
   * fetched, but the on-chain timestamp is different. Probable causes are:
   *
   * 1. The proof has been tampered with or was constructed incorrectly.
   *
   * Resolves to `VerifyStatus.Verified` if the block header is successfully
   * fetched, and the timestamps match. If the proof is committed to the Mainnet
   * or a trusted alternative network, the proof's hash can be trusted to have
   * existed by the proof's asserted timestamp.
   *
   * @param rpcURL Tezos node RPC base URL
   */
  async verify(rpcURL: string | URL): Promise<VerifyStatus> {
    const endpoint = new URL(
      `chains/${this.network}/blocks/${this.blockHash}/header`,
      rpcURL,
    );
    try {
      const response = await fetch(endpoint, {
        headers: {
          accept: "application/json",
        },
      });
      switch (response.status) {
        case 200:
          break;
        case 404:
          return VerifyStatus.NotFound;
        default:
          return VerifyStatus.NetError;
      }
      const header = await response.json();
      const timestamp = new Date(header.timestamp);
      if (timestamp.getTime() != this.timestamp.getTime()) {
        return VerifyStatus.Mismatch;
      }
      return VerifyStatus.Verified;
    } catch (_) {
      return VerifyStatus.NetError;
    }
  }

  toJSON(): AffixedProofTemplate {
    return {
      ...super.toJSON(),
      network: this.network,
      timestamp: this.timestamp.toISOString(),
    };
  }

  /**
   * [JTD] schema for an affixed proof template
   *
   * [JTD]: https://jsontypedef.com
   */
  static readonly schema: Schema = {
    properties: {
      version: { type: "uint32" },
      hash: { type: "string" },
      operations: {
        elements: Operation.schema,
      },
      network: { type: "string" },
      timestamp: { type: "timestamp" },
    },
  };
}

/**
 * Pending proof constructor options
 */
export interface PendingProofOptions extends ProofOptions {
  remote: string | URL;
}

/**
 * Pending proof template
 */
export interface PendingProofTemplate extends ProofTemplate {
  remote: string;
}

/**
 * Proof segment awaiting remote proof
 */
export class PendingProof extends Proof {
  /**
   * Remote proof URL
   */
  readonly remote: URL;

  /**
   * @param hash Input hash
   * @param operations Proof operations
   * @param remote Remote proof URL
   */
  constructor({ hash, operations, remote }: PendingProofOptions) {
    super({ hash, operations });
    this.remote = remote instanceof URL ? remote : new URL(remote);
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
   * ```ts
   * await pendingProof.resolve();
   * // AffixedProof { ... }
   * ```
   */
  async resolve(): Promise<Proof> {
    const response = await fetch(this.remote, {
      headers: {
        accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new FetchError(
        response.status,
        "Could not resolve remote proof",
      );
    }
    const template = await response.json();
    const proof = Proof.from(template);
    return this.concat(proof);
  }

  toJSON(): PendingProofTemplate {
    return {
      ...super.toJSON(),
      remote: this.remote.toString(),
    };
  }

  /**
   * [JTD] schema for a pending proof template
   *
   * [JTD]: https://jsontypedef.com
   */
  static readonly schema: Schema = {
    properties: {
      version: { type: "uint32" },
      hash: { type: "string" },
      operations: {
        elements: Operation.schema,
      },
      remote: { type: "string" },
    },
  };
}
