import { compare, concat, readStream } from "../src/mod.ts";
import { Readable } from "https://deno.land/std@0.95.0/node/stream.ts";

import {
  assert,
  assertEquals,
  AssertionError,
  assertThrowsAsync,
} from "https://deno.land/std@0.95.0/testing/asserts.ts";

Deno.test("Concatenation", () => {
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

Deno.test("Read stream collector", async () => {
  // Read mixed types
  assertEquals(
    await readStream(
      new Readable({
        read() {
          this.push(new Uint8Array([1, 2, 3]));
          this.push("hello");
          this.push("060708", "hex");
          this.push(null);
        },
      }),
    ),
    new Uint8Array([1, 2, 3, 104, 101, 108, 108, 111, 6, 7, 8]),
  );

  // Stream must not be in object mode
  assertThrowsAsync(async () => {
    await readStream(
      new Readable({ objectMode: true }),
    );
  }, AssertionError);

  // Reject on emitted error
  assertThrowsAsync(async () => {
    await readStream(
      new Readable({
        read() {
          this.destroy(new Error("test"));
        },
      }),
    );
  }, Error);
});
