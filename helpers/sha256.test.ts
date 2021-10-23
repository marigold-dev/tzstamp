import { Sha256 } from "./sha256.ts";
import { assert, assertEquals, assertThrows } from "./dev_deps.ts";

Deno.test({
  name: "Sha256 class interface",
  fn() {
    const hash = new Sha256();
    assert(!hash.finalized);
    hash.update(new Uint8Array([]));
    assert(!hash.finalized);
    const digest = hash.digest();
    assert(hash.finalized);
    assertEquals(digest, hash.digest());
    assertThrows(() => hash.update(new Uint8Array([])));
  },
});

Deno.test({
  name: "SHA-256 test vectors",
  fn() {
    assertEquals(
      Sha256.digest(new Uint8Array()),
      // deno-fmt-ignore
      [
        227, 176, 196,  66, 152, 252,  28,  20,
        154, 251, 244, 200, 153, 111, 185,  36,
         39, 174,  65, 228, 100, 155, 147,  76,
        164, 149, 153,  27, 120,  82, 184,  85,
      ],
    );
    assertEquals(
      Sha256.digest(new TextEncoder().encode("abc")),
      // deno-fmt-ignore
      [
        186, 120,  22, 191, 143,   1, 207, 234,
         65,  65,  64, 222,  93, 174,  34,  35,
        176,   3,  97, 163, 150,  23, 122, 156,
        180,  16, 255,  97, 242,   0,  21, 173,
      ],
    );
    assertEquals(
      Sha256.digest(new Uint8Array(123).fill(1)),
      // deno-fmt-ignore
      [
         62,  40, 216, 212, 230,  73, 221, 101,
        223,  81, 245, 183, 250, 217,  78, 187,
        145,  91,  61, 135,  31,  11,  76, 168,
        203, 225,  97, 117, 112, 151, 107,  65,
      ],
    );
    assertEquals(
      Sha256.digest(new Uint8Array(63).fill(1)),
      // deno-fmt-ignore
      [
         67, 110, 103, 172, 201,  29,  33, 167,
        113, 226,  46, 226, 168, 139, 143, 108,
        244,  16,  63, 152,  56,  65, 254,  84,
        118,  34,  17,  20, 220, 138, 124,  88,
      ],
    );
    assertEquals(
      Sha256.digest(Uint8Array.from({ length: 255 }, (_, i) => +i)),
      // deno-fmt-ignore
      [
         63, 133, 145,  17,  44, 107, 190,  92,
        150,  57, 101, 149,  78,  41,  49,   8,
        183,  32, 142, 210, 175, 137,  62,  80,
         13, 133, 147, 104, 198,  84, 234, 190
      ],
    );
  },
});
