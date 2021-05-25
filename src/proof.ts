import {
  Blake2bOperation,
  JoinOperation,
  Operation,
  OperationTemplate,
  Sha256Operation,
} from "./operation.ts";
import { Base58, compare, Hex } from "./deps.deno.ts";
import { isValid, Schema } from "./_validate.ts";

/**
 * Proof constructor options
 */
export interface ProofOptions {
  operations?: Operation[];
  hash?: Uint8Array;
  timestamp?: Date;
  network?: string;
}

/**
 * Proof template
 */
export interface ProofTemplate {
  version: number;
}

/**
 * Cryptographic proof-of-inclusion
 */
export class Proof {
  /**
   * Input hash
   */
  readonly hash?: Uint8Array;

  /**
   * Target timestamp
   */
  readonly timestamp?: Date;

  /**
   * Tezos network
   */
  readonly network?: string;

  /**
   * Proof operations
   */
  readonly operations: Operation[];

  /**
   * Throws if `network` identifier is invalid.
   *
   * @param hash Input hash
   * @param timestamp Target timestamp
   * @param network Tezos network ID
   * @param operations Proof operations
   */
  constructor({ hash, timestamp, network, operations }: ProofOptions = {}) {
    // Validate network ID
    if (network) {
      try {
        const rawNetwork = Base58.decodeCheck(network);
        if (rawNetwork.length != 7) throw null;
        if (!compare(rawNetwork.slice(0, 3), Proof.NETWORK_PREFIX)) throw null;
      } catch (_) {
        throw new Error("Invalid network ID");
      }
      this.network = network;
    }

    this.hash = hash;
    this.timestamp = timestamp;
    this.operations = operations ?? [];
  }

  /**
   * Converts the proof to a JSON-serializable template.
   *
   * ```ts
   * JSON.stringify(myProof);
   * // `myProof.toJSON` is called implicitly
   * ```
   */
  toJSON(): ProofV1Template {
    const template: ProofV1Template = {
      version: 1,
      operations: [],
    };
    for (const operation of this.operations) {
      template.operations.push(operation.toJSON());
    }
    if (this.hash) {
      template.hash = Hex.stringify(this.hash);
    }
    if (this.timestamp) {
      template.timestamp = this.timestamp.toISOString();
    }
    if (this.network) {
      template.network = this.network;
    }
    return template;
  }

  /**
   * Derives the output of all operations committed sequentially to an input hash.
   *
   * ```ts
   * myProof.operations;
   * // [
   * //   Sha256Operation,
   * //   Append { data: 0xb9f638a193 },
   * //   Blake2bOperation { length: 64 }
   * // ]
   *
   * myProof.derive(fileBuffer);
   * // 1. SHA-256(fileBuffer) -> result
   * // 2. concat(result, 0xb9f638a193) -> result
   * // 3. BLAKE2b(result, 64-byte digest) -> return result
   * ```
   *
   * @param hash Input hash
   */
  derive(hash: Uint8Array): Uint8Array {
    if (this.hash && !compare(this.hash, hash)) {
      throw new Error("Input hash does not match stored hash");
    }
    return this.operations.reduce((acc, op) => op.commit(acc), hash);
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
  static readonly NETWORK_PREFIX = new Uint8Array([87, 82, 0]);

  /**
   * JTD schema for a proof template
   *
   * [JTD]: https://jsontypedef.com
   */
  static readonly schema: Schema = {
    properties: {
      version: { type: "uint32" },
    },
    additionalProperties: true,
  };

  /**
   * Creates a proof from a template object.
   * Throws if the template is invalid or the proof version is not supported.
   *
   * ```ts
   * Proof.from({
   *   version: 1,
   *   network: "NetXdQprcVkpaWU"
   * });
   * // Proof { network: "NetXdQprcVkpaWU" }
   * ```
   *
   * @param template Template object
   */
  static from(template: unknown): Proof {
    if (!isValid<ProofTemplate>(Proof.schema, template)) {
      throw new Error("Invalid proof");
    }
    switch (template.version) {
      case 0:
        return parseV0(template);
      case 1:
        return parseV1(template);
      default:
        throw new Error(`Unsupported proof version "${template.version}"`);
    }
  }
}

// ---- Parsers ----

interface ProofV0Template extends ProofTemplate {
  ops: string[][];
  network: string;
}

const proofV0Schema: Schema = {
  properties: {
    version: { type: "uint32" },
    network: { type: "string" },
    ops: {
      elements: {
        elements: { type: "string" },
      },
    },
  },
};

function parseV0(template: unknown): Proof {
  if (!isValid<ProofV0Template>(proofV0Schema, template)) {
    throw new Error("Invalid version 0 proof");
  }
  return new Proof({
    network: template.network,
    operations: template.ops.map(([...args]) => {
      switch (args[0]) {
        case "prepend":
          return new JoinOperation(Hex.parse(args[1]), true);
        case "append":
          return new JoinOperation(Hex.parse(args[1]));
        case "blake2b":
          return new Blake2bOperation();
        case "sha-256":
          return new Sha256Operation();
        default:
          throw new Error(`Unsupported operation "${args[0]}"`);
      }
    }),
  });
}

interface ProofV1Template extends ProofTemplate {
  operations: OperationTemplate[];
  hash?: string;
  timestamp?: string;
  network?: string;
}

const proofv1Schema: Schema = {
  properties: {
    version: { type: "uint32" },
    operations: {
      elements: Operation.schema,
    },
  },
  optionalProperties: {
    hash: { type: "string" },
    timestamp: { type: "timestamp" },
    network: { type: "string" },
  },
};

function parseV1(template: unknown): Proof {
  if (!isValid<ProofV1Template>(proofv1Schema, template)) {
    throw new Error("Invalid version 1 proof");
  }
  const options: ProofOptions = {
    operations: template.operations.map(Operation.from),
    network: template.network,
  };
  if (template.hash) {
    if (!Hex.validator.test(template.hash)) {
      throw new Error("Invalid input hash");
    }
    options.hash = Hex.parse(template.hash);
  }
  if (template.timestamp) {
    options.timestamp = new Date(template.timestamp);
  }
  return new Proof(options);
}
