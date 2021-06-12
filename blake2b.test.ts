import { Blake2b } from "./blake2b.ts";
import { vectors } from "./_blake2b_vectors.test.ts";
import { assert, assertEquals, assertThrows } from "./dev_deps.ts";

Deno.test({
  name: "Test vectors",
  fn() {
    for (const vector of vectors) {
      // Class interface
      const digest = new Blake2b(vector.key, 64)
        .update(vector.input)
        .digest();
      assertEquals(digest, vector.digest);

      // Convenience function
      const digestQuick = Blake2b.digest(vector.input, vector.key, 64);
      assertEquals(digestQuick, vector.digest);
    }
  },
});

Deno.test({
  name: "Blake2b class interface",
  fn() {
    const hash = new Blake2b(undefined, 54);
    assert(!hash.finalized);
    assertEquals(hash.digestLength, 54);
    hash.update(new Uint8Array([]));
    assert(!hash.finalized);
    const digest = hash.digest();
    assert(hash.finalized);
    assertEquals(digest, hash.digest());
    assertThrows(() => hash.update(new Uint8Array([])));
    assertThrows(() => new Blake2b(new Uint8Array(65)));
    assertThrows(() => new Blake2b(undefined, -1));
    assertThrows(() => new Blake2b(undefined, 65));
  },
});
