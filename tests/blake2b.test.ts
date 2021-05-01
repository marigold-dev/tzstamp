import { blake2b } from "../src/mod.ts";
import { assertEquals } from "https://deno.land/std@0.95.0/testing/asserts.ts";

Deno.test("Produce 256-bit blake2b digest", () => {
  // Hash empty string
  const empty = new Uint8Array([]);
  assertEquals(
    blake2b(empty),
    // deno-fmt-ignore
    new Uint8Array([
       14,  87,  81, 192,  38, 229,  67, 178,
      232, 171,  46, 176,  96, 153, 218, 161,
      209, 229, 223,  71, 119, 143, 119, 135,
      250, 171,  69, 205, 241,  47, 227, 168,
    ]),
  );

  // Hash 'hello' (single block)
  const hello = new Uint8Array([104, 101, 108, 108, 111]);
  assertEquals(
    blake2b(hello),
    // deno-fmt-ignore
    new Uint8Array([
       50,  77, 207,   2, 125, 212, 163,  10,
      147,  44,  68,  31,  54,  90,  37, 232,
      107,  23,  61, 239, 164, 184, 229, 137,
       72,  37,  52, 113, 184,  27, 114, 207,
    ]),
  );

  // Hash ascending bytes (multiple blocks)
  const ascending = new Uint8Array(2 ** 11);
  ascending.forEach((_, idx) => ascending[idx] = idx);
  assertEquals(
    blake2b(ascending),
    // deno-fmt-ignore
    new Uint8Array([
      110, 217, 191,  84,  87,   5, 219, 165,
      151,  30, 131, 161, 242, 164, 106, 157,
      213, 172,  47, 232, 169,  52, 241,  60,
      238, 141,  53,  48,   3, 234, 249,   8,
    ]),
  );
});
