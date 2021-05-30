import { AffixOperation, Operation, OperationTemplate } from "./operation.ts";
import { Base58, compare, concat, Hex } from "./deps.deno.ts";
import { isValid, Schema } from "./_validate.ts";
import {
  InvalidTemplateError,
  MismatchedHashError,
  UnallowedOperationError,
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
 * Proof affixation
 */
export interface Affixation {
  /**
   * Tezos network identifier
   */
  network: string;

  /**
   * Timestamp asserted by the proof
   */
  timestamp: Date;

  /**
   * Tezos Base-58 encoded block hash
   */
  blockHash: string;
}

/**
 * Verification status of a proof
 */
export enum VerificationStatus {
  /**
   * Proof is successfully verified. The stored
   * input hash existed by the stored timestamp.
   */
  Verified = "verified",

  /**
   * Proof could not be verified. The proof does
   * not include a block-level affixation.
   */
  Unaffixed = "unaffixed",

  /**
   * Proof could not be verified. The Tezos node
   * could not be contacted, or the client is not
   * authorized to access the node.
   */
  CommunicationError = "commerror",

  /**
   * Proof could not be verified. The Tezos node
   * could not find the block at the affixed address.
   */
  BlockNotFound = "notfound",

  /**
   * Proof could not be verified. The stored timestamp
   * does not match the on-chain timestamp. The
   * proof has been modified, perhaps maliciously.
   */
  TimestampMismatch = "difftimestamp",
}

/**
 * Cryptographic proof-of-inclusion
 */
export class Proof {
  /**
   * Input hash
   */
  readonly hash: Uint8Array;

  /**
   * Proof operations
   */
  readonly operations: Operation[] = [];

  /**
    * Affixation to a Tezos block.
    * If defined, the proof can be verified by fetching the block header
    * of the derived block hash from a Tezos node on the appropriate
    * network and comparing the timestamp.
    */
  readonly affixation?: Affixation;

  /**
   * Output of all operations applied sequentially to the input hash.
   */
  readonly derivation: Uint8Array;

  /**
   * Proofs may only include a single operation-level affixation and
   * block-level affixation each. Throws `UnallowedOperationError` if
   * there are multiple same-level affixations.
   *
   * The block-level affixation must be the last operation in the proof.
   * Throws `UnallowedOperationError` if there are operations after a
   * block-level affixation.
   *
   * If an operation-level and block-level are both included in the proof,
   * their timestamps must match. Throws `MismatchedTimestampError` if
   * the timestamps do not match.
   *
   * @param hash Input hash
   * @param operations Proof operations
   */
  constructor(hash: Uint8Array, operations: Operation[]) {
    this.hash = hash;
    this.operations = operations;
    this.derivation = hash;

    // Verify operations and compute derivations
    for (const operation of operations) {
      // Prevent operations from continuing after an affixation
      if (this.affixation) {
        throw new UnallowedOperationError("Operation after affixation");
      }

      // Store affixation
      if (operation instanceof AffixOperation) {
        this.affixation = {
          network: operation.network,
          timestamp: operation.timestamp,
          blockHash: Base58.encodeCheck(
            concat(1, 52, this.derivation), // Tezos block hash prefix is \001\052
          ),
        };
      }

      this.derivation = operation.commit(this.derivation);
    }
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
   * Verifies a proof. Returns `false` if the proof is unaffixed to a block,
   * if the Tezos node cannot find the block, if the timestamp does not match,
   * or if the
   * @param rpcURL
   */
  async verify(rpcURL: string | URL): Promise<VerificationStatus> {
    if (!this.affixation) {
      return VerificationStatus.Unaffixed;
    }
    const endpoint = new URL(
      `/chains/${this.affixation.network}/blocks/${this.affixation.blockHash}/header`,
      rpcURL,
    );
    const response = await fetch(endpoint);
    switch (response.status) {
      case 404:
        return VerificationStatus.BlockNotFound;
      case 200:
        break;
      default:
        return VerificationStatus.CommunicationError;
    }
    const header = await response.json();
    const timestamp = new Date(header.timestamp);
    if (timestamp.getTime() != this.affixation.timestamp.getTime()) {
      return VerificationStatus.TimestampMismatch;
    }
    return VerificationStatus.Verified;
  }

  /**
   * Concatenates another proof's operations to the current one.
   * Throws `MismatchedHashError` if the derivation of the current proof does not match
   * the stored hash of the passed proof.
   *
   * [Finalized proofs](#FinalizedProof) are viral. Concatenating a finalized proof
   * produces another finalized proof.
   *
   * @param proof Proof to append
   */
  concat(proof: Proof): Proof {
    if (!compare(this.derivation, proof.hash)) {
      throw new MismatchedHashError(
        "Derivation of current proof does not match the stored hash of the appended proof",
      );
    }
    return new Proof(
      this.hash,
      this.operations.concat(proof.operations),
    );
  }

  /**
   * JTD schema for a proof template
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
    if (supported.includes(template.version)) {
      if (!Hex.validator.test(template.hash)) {
        throw new SyntaxError("Invalid input hash");
      }
      return new Proof(
        Hex.parse(template.hash),
        template.operations.map(Operation.from),
      );
    }
    throw new UnsupportedVersionError(
      `Unsupported proof version "${template.version}"`,
    );
  }
}
