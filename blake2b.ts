/** Initialization vector */
const IV = [
  0x6a09e667f3bcc908n,
  0xbb67ae8584caa73bn,
  0x3c6ef372fe94f82bn,
  0xa54ff53a5f1d36f1n,
  0x510e527fade682d1n,
  0x9b05688c2b3e6c1fn,
  0x1f83d9abfb41bd6bn,
  0x5be0cd19137e2179n,
] as const;

/** Message Schedule */
const SIGMA = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
  [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
  [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
  [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
  [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
  [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
  [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
  [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
  [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0],
] as const;

/** Mix word indices */
const MIX_INDICES = [
  [0, 4, 8, 12],
  [1, 5, 9, 13],
  [2, 6, 10, 14],
  [3, 7, 11, 15],
  [0, 5, 10, 15],
  [1, 6, 11, 12],
  [2, 7, 8, 13],
  [3, 4, 9, 14],
] as const;

/**
 * [BLAKE2b] streaming hash function.
 *
 * ```js
 * const message = new TextEncoder().encode("hello");
 * const hash = new Blake2b();
 *
 * hash.update(message);
 * hash.finalized; // false
 *
 * hash.digest(); // Uint8Array(32)
 * hash.finalized; // true
 * ```
 *
 * [BLAKE2b]: https://www.blake2.net
 */
export class Blake2b {
  private state = new ArrayBuffer(64);
  private buffer = new ArrayBuffer(128);
  private offset = 0n;
  private final = false;
  private counter = 0;

  /** Length of digest in bytes. */
  readonly digestLength: number;

  /** Returns true if the hash function is finalized. */
  get finalized(): boolean {
    return this.final;
  }

  /**
   * Throws `RangeError` if either the key or digest length are
   * larger than 64 bytes, or if the digest length is negative.
   *
   * @param key Hash key. Must be between 0-64 bytes.
   * @param digestLength Length of digest in bytes, defaulting to 32. Must be between 0-64 bytes.
   */
  constructor(key: Uint8Array = new Uint8Array(), digestLength: number = 32) {
    if (key.length > 64) {
      throw new RangeError("Key must be less than 64 bytes");
    }
    if (digestLength < 0) {
      throw new RangeError("Digest length must be a positive value");
    }
    if (digestLength > 64) {
      throw new RangeError("Digest length must be less than 64 bytes");
    }
    this.digestLength = digestLength;
    this.init(key);
  }

  private init(key: Uint8Array): void {
    const state = new BigUint64Array(this.state);
    state.set(IV);
    state[0] ^= 0x01010000n ^ BigInt(key.length << 8 ^ this.digestLength);
    if (key.length) {
      this.update(key);
      this.counter = 128;
    }
  }

  /**
   * Feeds input into the hash function in 128 byte blocks.
   * Throws is the hash function is finalized.
   *
   * @param input Input bytes
   */
  update(input: Uint8Array): this {
    if (this.final) {
      throw new Error("Cannot update finalized hash function.");
    }
    const buffer = new Uint8Array(this.buffer);
    for (let i = 0; i < input.length; ++i) {
      if (this.counter == 128) {
        this.counter = 0;
        this.offset += 128n;
        this.compress();
      }
      buffer[this.counter++] = input[i];
    }
    return this;
  }

  private compress(last = false): void {
    const state = new BigUint64Array(this.state);
    const buffer = new DataView(this.buffer);
    const vector = new BigUint64Array(16);

    // Initialize work vector
    vector.set(state);
    vector.set(IV, 8);
    vector[12] ^= this.offset;
    vector[13] ^= this.offset >> 64n;
    if (last) {
      vector[14] = ~vector[14];
    }

    // Twelve rounds of mixing
    const rotate = (x: bigint, y: bigint) => x >> y ^ x << 64n - y;
    for (let i = 0; i < 12; ++i) {
      const s = SIGMA[i % 10];
      for (let j = 0; j < 8; ++j) {
        const x = buffer.getBigUint64(s[2 * j] * 8, true);
        const y = buffer.getBigUint64(s[2 * j + 1] * 8, true);
        const [a, b, c, d] = MIX_INDICES[j];
        vector[a] += vector[b] + x;
        vector[d] = rotate(vector[d] ^ vector[a], 32n);
        vector[c] += vector[d];
        vector[b] = rotate(vector[b] ^ vector[c], 24n);
        vector[a] += vector[b] + y;
        vector[d] = rotate(vector[d] ^ vector[a], 16n);
        vector[c] += vector[d];
        vector[b] = rotate(vector[b] ^ vector[c], 63n);
      }
    }

    // Update state
    for (let i = 0; i < 8; ++i) {
      state[i] ^= vector[i] ^ vector[i + 8];
    }
  }

  /** Finalizes the state and produces a digest. */
  digest(): Uint8Array {
    const state = new Uint8Array(this.state);
    if (this.final) {
      return state.slice(0, this.digestLength);
    }
    this.offset += BigInt(this.counter);
    const buffer = new Uint8Array(this.buffer);
    while (this.counter < 128) {
      buffer[this.counter++] = 0;
    }
    this.compress(true);
    this.final = true;
    return state.slice(0, this.digestLength);
  }

  /**
   * Produces an immediate BLAKE2b digest.
   *
   * @param input Input bytes
   * @param key Hash key. Must be between 0-64 bytes.
   * @param digestLength Length of digest in bytes, defaulting to 32. Must be between 0-64 bytes.
   */
  static digest(
    input: Uint8Array,
    key?: Uint8Array,
    digestLength?: number,
  ): Uint8Array {
    return new Blake2b(key, digestLength)
      .update(input)
      .digest();
  }
}
