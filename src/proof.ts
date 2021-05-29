import { AffixOperation, Operation, OperationTemplate } from "./operation.ts";
import { Base58, compare, concat, Hex } from "./deps.deno.ts";
import { isValid, Schema } from "./_validate.ts";
import {
  InvalidTemplateError,
  MismatchedHashError,
  MismatchedTimestampError,
  UnallowedOperationError,
  UnsupportedVersionError,
} from "./errors.ts";

/**
 * Tezos block hash prefix. See `module Prefix` module in
 * [base58.ml] for the official Tezos implementation.
 *
 * [base58.ml]: https://gitlab.com/tezos/tezos/-/blob/master/src/lib_crypto/base58.ml
 */
const BLOCK_HASH_PREFIX = new Uint8Array([1, 52]);

/**
 * Tezos operation hash prefix. See `module Prefix` module in
 * [base58.ml] for the official Tezos implementation.
 *
 * [base58.ml]: https://gitlab.com/tezos/tezos/-/blob/master/src/lib_crypto/base58.ml
 */
const OPERATION_HASH_PREFIX = new Uint8Array([5, 116]);

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
   * Indicates that the proof is affixed to a Tezos operation group.
   * If true, the proof can be verified by searching a Tezos indexer
   * for the derived operation hash and comparing the timestamp.
   */
  readonly isAffixedToOperation: boolean;

  /**
    * Indicates that the proof is affixed to a Tezos block.
    * If true, the proof can be verified by fetching the block header
    * of the derived block hash from a Tezos node on the appropriate
    * network and comparing the timestamp.
    */
  readonly isAffixedToBlock: boolean;

  /**
   * Output of all operations applied sequentially to the input hash.
   */
  readonly derivation: Uint8Array;

  /**
   * Tezos Base-58 encoded operation hash. Will be `null` if the proof
   * does not include an operation-level affixation operation.
   */
  readonly operationHash: string | null;

  /**
   * Tezos Base-58 encoded block hash. Will be `null` if the proof
   * does not include a block-level affixation operation.
   */
  readonly blockHash: string | null;

  /**
   * Timestamp asserted by the proof. Will be `null` if the proof
   * does not include an affixation operation.
   */
  readonly timestamp: Date | null;

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

    let isAffixedToOperation = false;
    let isAffixedToBlock = false;
    let derivation = hash;
    let operationHash = null;
    let blockHash = null;
    let timestamp = null;

    // Verify operations and compute derivations
    for (const operation of operations) {
      // Prevent operations from continuing after a block-level affixation
      if (isAffixedToBlock) {
        throw new UnallowedOperationError("Operation after block affixation");
      }

      // Keep track of affixations
      if (operation instanceof AffixOperation) {
        switch (operation.level) {
          case "operation":
            // Prevent multiple operation-level affixations
            if (isAffixedToOperation) {
              throw new UnallowedOperationError(
                "Multiple operation affixations",
              );
            }
            timestamp = operation.timestamp;
            operationHash = Base58.encodeCheck(concat(
              OPERATION_HASH_PREFIX,
              derivation,
            ));
            isAffixedToOperation = true;
            break;
          case "block":
            // Prevent mismatched timestamps
            if (
              timestamp &&
              operation.timestamp.getTime() != timestamp.getTime()
            ) {
              throw new MismatchedTimestampError(
                "Timestamp of operation affixation does not match timestamp of block affixation",
              );
            }
            blockHash = Base58.encodeCheck(concat(
              BLOCK_HASH_PREFIX,
              derivation,
            ));
            isAffixedToBlock = true;
        }
      }

      derivation = operation.commit(derivation);
    }

    this.isAffixedToOperation = isAffixedToOperation;
    this.isAffixedToBlock = isAffixedToBlock;
    this.derivation = derivation;
    this.operationHash = operationHash;
    this.blockHash = blockHash;
    this.timestamp = timestamp;
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
