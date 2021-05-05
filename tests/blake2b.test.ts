import { Blake2b, blake2b } from "../src/mod.ts";
import { vectors } from "./blake2b-vectors.ts";
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.95.0/testing/asserts.ts";

Deno.test("Test vectors", () => {
  for (const vector of vectors) {
    const digest = new Blake2b(64, vector.key)
      .update(vector.input)
      .digest();
    assertEquals(digest, vector.digest);
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
