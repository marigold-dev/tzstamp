import { Operation, OperationTemplate } from "./operation.ts";
import { compare, Hex } from "./deps.deno.ts";
import { isValid, Schema } from "./_validate.ts";

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
 * Unsupported proof version error
 */
export class UnsupportedVersionError extends Error {
  name = "UnsupportedVersionError";
}

/**
 * Mismatched hash error
 */
export class MismatchedHashError extends Error {
  name = "MismatchedHashError";
}

/**
 * Invalid proof error
 */
export class InvalidProofError extends Error {
  name = "InvalidProofError";
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
  readonly operations: Operation[];

  /**
   * @param hash Input hash
   * @param operations Proof operations
   */
  constructor(hash: Uint8Array, operations: Operation[]) {
    this.hash = hash;
    this.operations = operations;
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
   * Derives the output of all operations committed sequentially to an input hash.
   * Throws `MismatchedHashError` if input hash and stored hash do not match.
   *
   * ```ts
   * myProof.operations;
   * // [
   * //   Sha256Operation,
   * //   AppendOperation { data: 0xb9f638a193 },
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
    if (!compare(this.hash, hash)) {
      throw new MismatchedHashError("Input hash does not match stored hash");
    }
    return this.operations.reduce((acc, op) => op.commit(acc), hash);
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
    if (!compare(this.derive(this.hash), proof.hash)) {
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
   * Throws `InvalidProofError` if the template is invalid.
   * Throws `UnsupportedVersionError` if the template version is unsupported.
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
      throw new InvalidProofError("Invalid proof");
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
