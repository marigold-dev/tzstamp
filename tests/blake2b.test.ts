import { Blake2b, blake2b } from "../src/mod.ts";
import { vectors } from "./blake2b-vectors.test.ts";
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.95.0/testing/asserts.ts";

Deno.test("Test vectors", () => {
  for (const vector of vectors) {
    // Class interface
    const digest = new Blake2b(64, vector.key)
      .update(vector.input)
      .digest();
    assertEquals(digest, vector.digest);

    // Convenience function
    const digestQuick = blake2b(vector.input, 64, vector.key);
    assertEquals(digestQuick, vector.digest);
  }
});

Deno.test("Blake2b class interface", () => {
  const hash = new Blake2b(54);
  assert(!hash.finalized);
  assertEquals(hash.digestLength, 54);
  hash.update(new Uint8Array([]));
  assert(!hash.finalized);
  hash.digest();
  assert(hash.finalized);
});

Deno.test("Memory reallocation", () => {
  const hashes = [];

  // Force instance memory reallocation
  for (let i = 0; i < 10000; ++i) {
    const block = new Uint8Array([0]);
    hashes.push(new Blake2b().update(block));
  }

  // Free up memory
  for (const hash of hashes) {
    hash.digest();
  }
});
