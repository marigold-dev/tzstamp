import {
  blake2b as blake2bHash,
  concat,
  createHash,
  Hex,
} from "./deps.deno.ts";

/**
 * Proof operation
 */
export interface Operation {
  /**
   * Represent operation as a user friendly string
   */
  toString(): string;

  /**
   * JSON serializer
   */
  toJSON(): string[];

  /**
   * Commit operation to input
   */
  commit(input: Uint8Array): Uint8Array;
}

// deno-lint-ignore no-namespace
export namespace Operation {
  /**
   * Prepend operation
   */
  export const prepend = (data: Uint8Array) => ({
    toString: () => `Prepend ${Hex.stringify(data)}`,
    toJSON: () => ["prepend", Hex.stringify(data)],
    commit: (input: Uint8Array) => concat(data, input),
  });

  /**
   * Append operation
   */
  export const append = (data: Uint8Array) => ({
    toString: () => `Append ${Hex.stringify(data)}`,
    toJSON: () => ["append", Hex.stringify(data)],
    commit: (input: Uint8Array) => concat(input, data),
  });

  /**
   * SHA-256 hash operation
   */
  export const sha256 = (): Operation => ({
    toString: () => "SHA-256",
    toJSON: () => ["sha-256"],
    commit: (input: Uint8Array) =>
      new Uint8Array(
        createHash("sha256")
          .update(input)
          .digest(),
      ),
  });

  /**
   * Blake2b-256 hash operation
   */
  export const blake2b = (): Operation => ({
    toString: () => "Blake2b-256",
    toJSON: () => ["blake2b"],
    commit: (input: Uint8Array) => blake2bHash(input),
  });
}
