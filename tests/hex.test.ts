import { Hex } from "../src/mod.ts";
import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.95.0/testing/asserts.ts";

Deno.test({
  name: "Encode byte array as hex string",
  fn() {
    // Encode filled byte array
    const bytes = new Uint8Array([0, 1, 2]);
    assertEquals(Hex.stringify(bytes), "000102");

    // Encode empty byte array
    const empty = new Uint8Array([]);
    assertEquals(Hex.stringify(empty), "");
  },
});

Deno.test({
  name: "Parse byte array from hex string",
  fn() {
    // Parse odd-length valid hex string
    assertEquals(Hex.parse("5f309"), new Uint8Array([5, 243, 9]));

    // Parse invalid hex string
    assertThrows(() => Hex.parse("not a hex string"), SyntaxError);

    // Parse empty string
    assertEquals(Hex.parse(""), new Uint8Array([]));
  },
});
