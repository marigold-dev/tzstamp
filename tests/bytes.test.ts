import { compare, concat } from "../src/mod.ts";

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.95.0/testing/asserts.ts";

Deno.test({
  name: "Concatenation",
  fn() {
    // Concatenate bytes arrays
    assertEquals(
      concat(
        new Uint8Array([1, 2]),
        new Uint8Array([3, 4, 5]),
        new Uint8Array([]),
      ),
      new Uint8Array([1, 2, 3, 4, 5]),
    );

    // Concatenate numbers
    assertEquals(
      concat(0, -0, 1, 2, 3, 277, -12),
      new Uint8Array([0, 0, 1, 2, 3, 21, 244]),
    );

    // Concatenate mix of numbers and byte arrays
    assertEquals(
      concat(
        new Uint8Array([6, 7, 8]),
        1,
        new Uint8Array([54, 55, 56]),
        255,
      ),
      new Uint8Array([6, 7, 8, 1, 54, 55, 56, 255]),
    );
  },
});

Deno.test({
  name: "Compare two byte arrays",
  fn() {
    // Compare two equal byte arrays
    assert(
      compare(
        new Uint8Array([1, 2, 3]),
        new Uint8Array([1, 2, 3]),
      ),
    );

    // Compare two same-length inequivalent byte arrays
    assert(
      !compare(
        new Uint8Array([1, 2, 3]),
        new Uint8Array([1, 3, 5]),
      ),
    );

    // Compare two different-length byte arrays
    assert(
      !compare(
        new Uint8Array([1, 2, 3]),
        new Uint8Array([1, 2, 3, 4]),
      ),
    );

    // Compare filled byte array to empty byte array
    assert(
      !compare(
        new Uint8Array([1, 2, 3]),
        new Uint8Array([]),
      ),
    );

    // Compare two empty byte arrays
    assert(
      compare(
        new Uint8Array([]),
        new Uint8Array([]),
      ),
    );
  },
});
