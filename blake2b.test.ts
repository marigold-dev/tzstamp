import { Blake2b } from "./blake2b.ts";
import { assert, assertEquals, assertThrows } from "./dev_deps.ts";

Deno.test({
  name: "Blake2b class interface",
  fn() {
    const hash = new Blake2b(undefined, 54);
    assert(!hash.finalized);
    assertEquals(hash.digestLength, 54);
    hash.update(new Uint8Array([]));
    assert(!hash.finalized);
    hash.digest();
    assert(hash.finalized);
    assertThrows(() => hash.update(new Uint8Array([])));
    assertThrows(() => new Blake2b(new Uint8Array(65)));
    assertThrows(() => new Blake2b(undefined, -1));
    assertThrows(() => new Blake2b(undefined, 65));
  },
});

Deno.test({
  name: "BLAKE2b test vectors",
  fn() {
    assertEquals(
      Blake2b.digest(new Uint8Array(), undefined, 64),
      // deno-fmt-ignore
      [
        120, 106,   2, 247,  66,   1,  89,   3,
        198, 198, 253, 133,  37,  82, 210, 114,
        145,  47,  71,  64, 225,  88,  71,  97,
        138, 134, 226,  23, 247,  31,  84,  25,
        210,  94,  16,  49, 175, 238,  88,  83,
         19, 137, 100,  68, 147,  78, 176,  75,
        144,  58, 104,  91,  20,  72, 183,  85,
        213, 111, 112,  26, 254, 155, 226, 206,
      ],
    );
    assertEquals(
      Blake2b.digest(new TextEncoder().encode("abc"), undefined, 64),
      // deno-fmt-ignore
      [
        186, 128, 165,  63, 152,  28,  77,  13,
        106,  39, 151, 182, 159,  18, 246, 233,
         76,  33,  47,  20, 104,  90, 196, 183,
         75,  18, 187, 111, 219, 255, 162, 209,
        125, 135, 197,  57,  42, 171, 121,  45,
        194,  82, 213, 222,  69,  51, 204, 149,
         24, 211, 138, 168, 219, 241, 146,  90,
        185,  35, 134, 237, 212,   0, 153,  35,
      ],
    );
    assertEquals(
      Blake2b.digest(
        Uint8Array.from({ length: 255 }, (_, i) => +i),
        undefined,
        64,
      ),
      // deno-fmt-ignore
      [
         91,  33, 197, 253, 136, 104,  54, 118,
         18,  71,  79, 162, 231,  14, 156, 250,
         34,   1, 255, 238, 232, 250, 250, 181,
        121, 122, 213, 143, 239, 161, 124, 155,
         91,  16, 125, 164, 163, 219,  99,  32,
        186, 175,  44, 134,  23, 213, 165,  29,
        249,  20, 174, 136, 218,  56, 103, 194,
        212,  31,  12, 193,  79, 166, 121,  40,
      ],
    );
    assertEquals(
      Blake2b.digest(
        Uint8Array.from({ length: 255 }, (_, i) => +i),
        Uint8Array.from({ length: 64 }, (_, i) => +i),
        64,
      ),
      // deno-fmt-ignore
      [
         20,  39,   9, 214,  46,  40, 252, 204,
        208, 175, 151, 250, 208, 248,  70,  91,
        151,  30, 130,  32,  29, 197,  16, 112,
        250, 160,  55,  42, 164,  62, 146,  72,
         75, 225, 193, 231,  59, 161,   9,   6,
        213, 209, 133,  61, 182, 164,  16, 110,
         10, 123, 249, 128,  13,  55,  61, 109,
        238,  45,  70, 214,  46, 242, 164,  97,
      ],
    );
    assertEquals(
      Blake2b.digest(new Uint8Array()),
      // deno-fmt-ignore
      [
         14,  87,  81, 192,  38, 229,  67, 178,
        232, 171,  46, 176,  96, 153, 218, 161,
        209, 229, 223,  71, 119, 143, 119, 135,
        250, 171,  69, 205, 241,  47, 227, 168,
      ],
    );
  },
});
