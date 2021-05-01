import { Base58 } from "../src/mod.ts";
import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.95.0/testing/asserts.ts";

Deno.test("Encode byte array as base-58 string", () => {
  // Encode 'hello' in UTF-8
  const hello = new Uint8Array([104, 101, 108, 108, 111]);
  assertEquals(Base58.encode(hello), "Cn8eVZg");

  // Encode empty byte array
  const empty = new Uint8Array([]);
  assertEquals(Base58.encode(empty), "");

  // Encode byte array with leading zeroes
  const leadingZeroes = new Uint8Array([0, 0, 0, 10, 20, 30, 40]);
  assertEquals(Base58.encode(leadingZeroes), "111FwdkB");
});

Deno.test("Decode byte array from base-58 string", () => {
  // Decode valid base-58 encoding
  assertEquals(
    Base58.decode("Cn8eVZg"),
    new Uint8Array([104, 101, 108, 108, 111]),
  );

  // Decode empty string
  assertEquals(Base58.decode(""), new Uint8Array([]));

  // Decode invalid base-58 string ('l' is not in the base-58 alphabet)
  assertThrows(() => Base58.decode("malformed"), SyntaxError);

  // Decode with leading zeroes
  assertEquals(
    Base58.decode("111FwdkB"),
    new Uint8Array([0, 0, 0, 10, 20, 30, 40]),
  );
});

Deno.test("Encode byte array as base-58 string with checksum", () => {
  // Checksum-encode 'hello' in UTF-8
  const hello = new Uint8Array([104, 101, 108, 108, 111]);
  assertEquals(Base58.encodeCheck(hello), "2L5B5yqsVG8Vt");

  // Checksum-encode empty byte array
  const empty = new Uint8Array([]);
  assertEquals(Base58.encodeCheck(empty), "3QJmnh");
});

Deno.test("Decode byte array from base-58 string with checksum", () => {
  // Checksum-decode valid base-58 encoding
  assertEquals(
    Base58.decodeCheck("2L5B5yqsVG8Vt"),
    new Uint8Array([104, 101, 108, 108, 111]),
  );

  // Checksum-decode valid base-58 encoding with bad checksum
  assertThrows(() => Base58.decodeCheck("abcdefghij"), Error);

  // Checksum-decode empty string
  assertEquals(Base58.decodeCheck("3QJmnh"), new Uint8Array([]));

  // Checksim-decode invalid base-58 string ('l' is not in the base-58 alphabet)
  assertThrows(() => Base58.decodeCheck("malformed"), SyntaxError);
});
