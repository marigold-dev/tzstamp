import { assert } from "./deps.deno.ts";
import { blake2bWasm } from "./blake2b-wasm.ts";

const instance = new WebAssembly.Instance(blake2bWasm);
const instanceMemory = instance.exports.memory as WebAssembly.Memory;
let memory = new Uint8Array(instanceMemory.buffer);
const {
  "blake2b_init": blake2bInit,
  "blake2b_update": blake2bUpdate,
  "blake2b_final": blake2bFinal,
} = instance.exports as Record<string, CallableFunction>;

// Memory management
let head = 64;
const freeList: number[] = [];
const STATE_SIZE = 216;
const PAGE_SIZE = 65536;

// Get a pointer to a free 216 byte block of memory
function getPointer(): number {
  // Grow instance memory if necessary
  if (head + STATE_SIZE > memory.length) {
    growMemory(head + STATE_SIZE);
  }

  // Create a pointers on-demand
  if (!freeList.length) {
    freeList.push(head);
    head += 216;
  }

  // Return a free pointer
  return freeList.pop() as number;
}

// Grow instance memory by 1 page (64Kib)
function growMemory(size: number) {
  const pages = Math.ceil(
    Math.abs(size - memory.length) / PAGE_SIZE,
  );
  instanceMemory.grow(pages);
  memory = new Uint8Array(instanceMemory.buffer);
}

/**
 * [BLAKE2b] hash algorithm implemented in WebAssembly.
 *
 * ```js
 * const message = new TextEncoder().encode("hello")
 * new Blake2b(32)
 *   .update(message)
 *   .digest();
 * // Uint8Array(32) [ 50, 77, 207, ... ]
 * ```
 *
 * [BLAKE2b]: https://www.blake2.net/blake2.pdf
 */
export class Blake2b {
  static MIN_DIGEST_BYTES = 1;
  static MAX_DIGEST_BYTES = 64;
  static MIN_KEY_BYTES = 1;
  static MAX_KEY_BYTES = 64;

  #finalized = false;
  #pointer = getPointer();

  /**
   * Length of digest in bytes.
   */
  readonly digestLength: number;

  /**
   * Returns true if the hash algorithm is finalized.
   */
  get finalized() {
    return this.#finalized;
  }

  /**
   * @param digestLength Length of digest in bytes, defaulting to 32
   * @param key Cryptographic key
   */
  constructor(digestLength: number = 32, key?: Uint8Array) {
    assert(
      digestLength >= Blake2b.MIN_DIGEST_BYTES,
      `digestLength must be at least ${Blake2b.MIN_DIGEST_BYTES}, was given ${digestLength}`,
    );
    assert(
      digestLength <= Blake2b.MAX_DIGEST_BYTES,
      `digestLength must be at most ${Blake2b.MAX_DIGEST_BYTES}, was given ${digestLength}`,
    );
    if (key != undefined) {
      assert(
        key.length >= Blake2b.MIN_KEY_BYTES,
        `key length must be at least ${Blake2b.MIN_KEY_BYTES}, was given key of length ${key.length}`,
      );
      assert(
        key.length <= Blake2b.MAX_KEY_BYTES,
        `key length must be at most ${Blake2b.MAX_KEY_BYTES}, was given key length of ${key.length}`,
      );
    }

    this.digestLength = digestLength;

    // Initialize
    memory.fill(0, 0, 64);
    memory.set([
      this.digestLength,
      key ? key.length : 0,
      1, // fanout
      1, // depth
    ]);
    blake2bInit(this.#pointer, this.digestLength);
    if (key) {
      this.update(key);
      memory.fill(0, head, head + key.length); // whiteout key
      memory[this.#pointer + 200] = 128;
    }
  }

  /**
   * Feeds input into the hash algorithm.
   *
   * @param input Input bytes
   */
  update(input: Uint8Array) {
    assert(this.#finalized == false, "Hash instance finalized");
    if (head + input.length > memory.length) {
      growMemory(head + input.length);
    }
    memory.set(input, head);
    blake2bUpdate(this.#pointer, head, head + input.length);
    return this;
  }

  /**
   * Finalizes the hash algorithm and produces a digest.
   */
  digest() {
    assert(this.#finalized === false, "Hash instance finalized");
    this.#finalized = true;
    freeList.push(this.#pointer);
    blake2bFinal(this.#pointer);
    return memory.slice(
      this.#pointer + 128,
      this.#pointer + 128 + this.digestLength,
    );
  }
}

/**
 * Produces a BLAKE2b digest.
 *
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
