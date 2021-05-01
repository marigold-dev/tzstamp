import { compare, concat } from "../src/mod.ts";
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.95.0/testing/asserts.ts";

Deno.test("Concatenate two byte arrays", () => {
  // Concatenate two filled arrays
  assertEquals(
    concat(
      new Uint8Array([1, 2]),
      new Uint8Array([3, 4]),
    ),
    new Uint8Array([1, 2, 3, 4]),
  );

  // Concatenate a filled array with an empty array
  assertEquals(
    concat(
      new Uint8Array([1, 2]),
      new Uint8Array([]),
    ),
    new Uint8Array([1, 2]),
  );

  // Concatenate two empty arrays
  assertEquals(
    concat(
      new Uint8Array([]),
      new Uint8Array([]),
    ),
    new Uint8Array([]),
  );
});

Deno.test("Compare two byte arrays", () => {
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
});
