import { assert } from "./deps.deno.ts";
import { blake2bWasm } from "./blake2b-wasm.ts";

/**
 * Minimum digest length in bytes
 */
export const DIGEST_BYTES_MIN = 16;

/**
 * Maximum digest length in bytes
 */
export const DIGEST_BYTES_MAX = 64;

/**
 * Minium key length in bytes
 */
export const KEY_BYTES_MIN = 16;

/**
 * Maximum key length in bytes
 */
export const KEY_BYTES_MAX = 64;

/**
 * Blake2b hash algorithm
 */
export class Blake2b {
  #instance = new WebAssembly.Instance(blake2bWasm);
  #instanceMemory = this.#instance.exports.memory as WebAssembly.Memory;
  #memory = new Uint8Array(this.#instanceMemory.buffer);
  #init = this.#instance.exports["blake2b_init"] as CallableFunction;
  #update = this.#instance.exports["blake2b_update"] as CallableFunction;
  #final = this.#instance.exports["blake2b_final"] as CallableFunction;
  #finalized = false;

  /**
   * Length of digest in bytes
   */
  readonly digestLength: number;

  /**
   * Status of algorithm
   */
  get finalized() {
    return this.#finalized;
  }

  /**
   * @param digestLength Length of digest in bytes
   * @param key Cryptographic key
   */
  constructor(digestLength: number = 32, key?: Uint8Array) {
    assert(
      digestLength >= DIGEST_BYTES_MIN,
      `digestLength must be at least ${DIGEST_BYTES_MIN}, was given ${digestLength}`,
    );
    assert(
      digestLength <= DIGEST_BYTES_MAX,
      `digestLength must be at most ${DIGEST_BYTES_MAX}, was given ${digestLength}`,
    );
    if (key != undefined) {
      assert(
        key.length >= KEY_BYTES_MIN,
        `key length must be at least ${KEY_BYTES_MIN}, was given key of length ${key.length}`,
      );
      assert(
        key.length <= KEY_BYTES_MAX,
        `key length must be at most ${KEY_BYTES_MAX}, was given key length of ${key.length}`,
      );
    }

    this.digestLength = digestLength;

    // Initialize
    this.#memory.fill(0, 0, 64);
    this.#memory.set([
      this.digestLength,
      key ? key.length : 0,
      1, // fanout
      1, // depth
    ]);
    this.#init(64, this.digestLength);
    if (key) {
      this.update(key);
      this.#memory.fill(0, 280, 280 + key.length); // whiteout key
      this.#memory[264] = 128;
    }
  }

  /**
   * Feed input into hash algorithm
   * @param input Input bytes
   */
  update(input: Uint8Array) {
    assert(this.#finalized == false, "Hash instance finalized");
    this.#memory.set(input, 280);
    this.#update(64, 280, 280 + input.length);
    return this;
  }

  /**
   * Produce final digest
   */
  digest() {
    assert(this.#finalized === false, "Hash instance finalized");
    this.#finalized = true;
    this.#final(64);
    return this.#memory.slice(192, 192 + this.digestLength);
  }
}

/**
 * Blake2b convenience method
 * @param input Input bytes
 * @param digestLength Digest length in bytes
 */
export function blake2b(
  input: Uint8Array,
  digestLength?: number,
  key?: Uint8Array,
) {
  return new Blake2b(digestLength, key)
    .update(input)
    .digest();
}
