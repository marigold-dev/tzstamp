/**
 * Blake2b initialization vector
 */
const BLAKE2B_IV32 = new Uint32Array([
  0xf3bcc908, 0x6a09e667, 0x84caa73b, 0xbb67ae85,
  0xfe94f82b, 0x3c6ef372, 0x5f1d36f1, 0xa54ff53a,
  0xade682d1, 0x510e527f, 0x2b3e6c1f, 0x9b05688c,
  0xfb41bd6b, 0x1f83d9ab, 0x137e2179, 0x5be0cd19
])

/**
 * Sigma permutations table
 */
const SIGMA = new Uint8Array([
   0,  2,  4,  6,  8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30,
  28, 20,  8, 16, 18, 30, 26, 12,  2, 24,  0,  4, 22, 14, 10,  6,
  22, 16, 24,  0, 10,  4, 30, 26, 20, 28,  6, 12, 14,  2, 18,  8,
  14, 18,  6,  2, 26, 24, 22, 28,  4, 12, 10, 20,  8,  0, 30, 16,
  18,  0, 10, 14,  4,  8, 20, 30, 28,  2, 22, 24, 12, 16,  6, 26,
   4, 24, 12, 20,  0, 22, 16,  6,  8, 26, 14, 10, 30, 28,  2, 18,
  24, 10,  2, 30, 28, 26,  8, 20,  0, 14, 12,  6, 18,  4, 16, 22,
  26, 22, 14, 28, 24,  2,  6, 18, 10,  0, 30,  8, 16, 12,  4, 20,
  12, 30, 28, 18, 22,  6,  0, 16, 24,  4, 26, 14,  2,  8, 20, 10,
  20,  4, 16,  8, 14, 12,  2, 10, 30, 22, 18, 28,  6, 24, 26,  0,
   0,  2,  4,  6,  8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30,
  28, 20,  8, 16, 18, 30, 26, 12,  2, 24,  0,  4, 22, 14, 10,  6
])

/**
 * Compression function
 * @param h State vector
 * @param b Bytes buffer
 * @param t Total compressed bytes counter
 * @param last Last block flag
 */
function compress (h: Uint32Array, b: Uint8Array, t: number, last: boolean) {

  // Initialize work variables
  const v = new Uint32Array(32)
  for (let i = 0; i < 16; ++i) {
    v[i] = h[i]
    v[i + 16] = BLAKE2B_IV32[i]
  }

  // Low 64 bits of offset
  v[24] ^= t
  v[25] ^= (t / 0x100000000)

  // Handle last block flag
  if (last) {
    v[28] = ~v[28]
    v[29] = ~v[29]
  }

  // Initialize padded message
  const m = new Uint32Array(32)
  for (let i = 0; i < 32; ++i)
    m[i] =
      b[i * 4] ^
      (b[i * 4 + 1] << 8) ^
      (b[i * 4 + 2] << 16) ^
      (b[i * 4 + 3] << 24)

  // Twelve rounds of mixing
  for (let i = 0; i < 12; ++i) {
    mix(v, m, 0,  8, 16, 24, SIGMA[i * 16 +  0], SIGMA[i * 16 +  1])
    mix(v, m, 2, 10, 18, 26, SIGMA[i * 16 +  2], SIGMA[i * 16 +  3])
    mix(v, m, 4, 12, 20, 28, SIGMA[i * 16 +  4], SIGMA[i * 16 +  5])
    mix(v, m, 6, 14, 22, 30, SIGMA[i * 16 +  6], SIGMA[i * 16 +  7])
    mix(v, m, 0, 10, 20, 30, SIGMA[i * 16 +  8], SIGMA[i * 16 +  9])
    mix(v, m, 2, 12, 22, 24, SIGMA[i * 16 + 10], SIGMA[i * 16 + 11])
    mix(v, m, 4, 14, 16, 26, SIGMA[i * 16 + 12], SIGMA[i * 16 + 13])
    mix(v, m, 6,  8, 18, 28, SIGMA[i * 16 + 14], SIGMA[i * 16 + 15])
  }

  // Update state vector
  for (let i = 0; i < 16; ++i)
    h[i] ^= v[i] ^ v[i + 16]
}

/**
 * Mixing function
 * @param v Work vector
 * @param m Padded message
 * @param a Work vector reference A
 * @param b Work vector reference B
 * @param c Work vector reference C
 * @param d Work vector reference D
 * @param x Padded message reference X
 * @param y Padded message reference Y
 */
function mix (
  v: Uint32Array,
  m: Uint32Array,
  a: number,
  b: number,
  c: number,
  d: number,
  x: number,
  y: number
) {

  let xor0, xor1

  // v[a, a+1] += v[b, b+1] + m[x, x+1]
  add64AA(v, a, b)
  add64AC(v, a, m[x], m[x + 1])

  // v[d, d+1] = (v[d, d+1] xor v[a, a+1]) rotated to the right by 32 bits
  xor0 = v[d] ^ v[a]
  xor1 = v[d + 1] ^ v[a + 1]
  v[d] = xor1
  v[d + 1] = xor0

  // v[c, c+1] += v[d, d+1]
  add64AA(v, c, d)

  // v[b, b+1] = (v[b, b+1] xor v[c, c+1]) rotated right by 24 bits
  xor0 = v[b] ^ v[c]
  xor1 = v[b + 1] ^ v[c + 1]
  v[b] = (xor0 >>> 24) ^ (xor1 << 8)
  v[b + 1] = (xor1 >>> 24) ^ (xor0 << 8)

  // v[a, a+1] += v[b, b+1] + m[y, y+1]
  add64AA(v, a, b)
  add64AC(v, a, m[y], m[y + 1])

  // v[d, d+1] = (v[d, d+1] xor v[a, a+1]) rotated right by 16 bits
  xor0 = v[d] ^ v[a]
  xor1 = v[d + 1] ^ v[a + 1]
  v[d] = (xor0 >>> 16) ^ (xor1 << 16)
  v[d + 1] = (xor1 >>> 16) ^ (xor0 << 16)

  // v[c, c+1] += v[d, d+1]
  add64AA(v, c, d)

  // v[b, b+1] = (v[b, b+1] xor v[c, c+1]) rotated right by 63 bits
  xor0 = v[b] ^ v[c]
  xor1 = v[b + 1] ^ v[c + 1]
  v[b] = (xor1 >>> 31) ^ (xor0 << 1)
  v[b + 1] = (xor0 >>> 31) ^ (xor1 << 1)
}

/**
 * Simulate 64-bit unsigned addition within 32-bit vector -
 * Sets v[a, a+1] += v[b, b+1]
 */
function add64AA (v: Uint32Array, a: number, b: number) {
  const o0 = v[a] + v[b]
  const o1 = v[a + 1] + v[b + 1] + (o0 >= 0x100000000 ? 1 : 0)
  v[a] = o0
  v[a + 1] = o1
}

/**
 * Simulate 64-bit unsigned addition into 32-bit vector -
 * Sets v[a, a+1] += b, where b0 and b1 are the low and high bits of b resepectively
 */
function add64AC (v: Uint32Array, a: number, b0: number, b1: number) {
  const o0 = v[a] + b0 + (b0 < 0 ? 0x100000000 : 0)
  const o1 = v[a + 1] + b1 + (o0 > 0x100000000 ? 1 : 0)
  v[a] = o0
  v[a + 1] = o1
}

/**
 * Create 256-bit blake2b digest
 */
export function blake2b (input: Uint8Array): Uint8Array {

  // Initialize state vector
  const h = new Uint32Array(16)
  for (let i = 0; i < 16; ++i)
    h[i] = BLAKE2B_IV32[i]
  h[0] ^= 0x1010020 // No key, hash length 32 bytes

  // Byte buffer and counters
  const b = new Uint8Array(128)
  let t = 0
  let c = 0

  // Exhaust input
  for (const byte of input) {

    // Compress buffer when full
    if (c == 128) {
      t += c // add counters
      compress(h, b, t, false)
      c = 0 // counter to zero
    }

    b[c++] = byte
  }

  // Mark last block offset
  t += c

  // Pad buffer with zeros
  while (c < 128)
    b[c++] = 0

  // Final compression
  compress(h, b, t, true)

  // Produce digest
  const digest = new Uint8Array(32)
  for (let i = 0; i < 32; ++i)
    digest[i] = h[i >> 2] >> (8 * (i & 3)) // convert to little endian

  return digest
}
