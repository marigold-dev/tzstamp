import { Operation, Proof } from "../src/mod.ts";
import { createHash } from "../src/deps.deno.ts";
import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.95.0/testing/asserts.ts";

const helloProof = {
  version: 0,
  network: "NetXSgo1ZT2DRUG",
  ops: [
    ["sha-256"],
    [
      "prepend",
      "0ee6cc343703bb63f024a84c5818cfd9dc7104007fa03b4fd645a1ad36609277",
    ],
    ["sha-256"],
    [
      "prepend",
      "515ae4da1102a705620b70ac3a058b899afcb298a49a5104f91ebb287da63e9a",
    ],
    ["sha-256"],
    [
      "append",
      "4970766a334375bffb9fa2085711c0f8ab8ef3ee7f7f4158d58ad8c44a6b3a16",
    ],
    ["sha-256"],
    [
      "prepend",
      "cdaa8dd4653439d8f139e6e9ef74542fd0d7e9fdaa0cb7635b5c5aba944ec9f06b00800af1bbdba836717c8d83c015bf402a5d303fe78c0bf7ad0fe8520000ad4aebb150a154d8d30d276cb93465611bf29a83eacaeae8cbd63612c83b64d86c00800af1bbdba836717c8d83c015bf402a5d303fe7c405f8ad0fc8184700010d98d95f726b65e40199645d719aa85085e9c8c800ff00000000250a00000020",
    ],
    [
      "append",
      "c71d2ba19266f79dd17adec3da4971a532f0afcf94362d139f94736f3d69de3db94dbd1501f23e40dfccbc8d4673fdd62b1d7a34f8f4f0857efabc17f6c37300",
    ],
    ["blake2b"],
    ["blake2b"],
    [
      "prepend",
      "b02aa9be34566dd338702241db7f3aa03cc56ed87b7184150b625b3b0c804611",
    ],
    ["blake2b"],
    ["blake2b"],
    [
      "prepend",
      "7c09f7c4d76ace86e1a7e1c7dc0a0c7edcaa8b284949320081131976a87760c3",
    ],
    ["blake2b"],
    [
      "prepend",
      "7c76e3fea03f97235c50832af8e820b1780188c680cdb5aaaab528d741387ada",
    ],
    ["blake2b"],
    [
      "prepend",
      "00016ed501cdaa8dd4653439d8f139e6e9ef74542fd0d7e9fdaa0cb7635b5c5aba944ec9f000000000605252db04",
    ],
    [
      "append",
      "000000110000000101000000080000000000016ed4b803dfa0fe01418b3bc63201b02b9e2eba55bd7aba6a7150c01f4bd9ff3f2b3000006102c8084a370300007c93824249aac0c43ba61455c604ff0fe0219d33548216f651a543b68ba3bcd6147636b7637351c5bf8f3ba2b43bac64235eee8ed2259d467ec45472749e4a0a",
    ],
    ["blake2b"],
  ],
};

Deno.test("Proof construction", () => {
  // Correct proof
  new Proof("NetXdQprcVkpaWU", [Operation.sha256()]);

  // Empty operations
  assertThrows(
    () => new Proof("NetXdQprcVkpaWU", []),
    Error,
    "Empty operations array",
  );

  // Network ID cannot be decoded and checked
  assertThrows(
    () => new Proof("abc", [Operation.sha256()]),
    Error,
    "Invalid network ID",
  );

  // Decoded network ID is wrong length
  assertThrows(
    () => new Proof("2LVJ4JR2W", [Operation.sha256()]),
    Error,
    "Invalid network ID",
  );

  // Decoded network ID has wrong prefix
  assertThrows(
    () => new Proof("NsA1RF51pJCZxfm", [Operation.sha256()]),
    Error,
    "Invalid network ID",
  );
});

Deno.test("Proof serialization and deserialization", () => {
  const json = JSON.stringify(helloProof);

  // Parse good serialized proof
  const proof = Proof.parse(json);

  // Serialize proof
  assertEquals(JSON.stringify(proof), json);

  // Parse bad JSON
  assertThrows(
    () => Proof.parse("bad json"),
    SyntaxError,
  );

  // Parse invalid formats
  assertThrows(() => Proof.parse("true"), Error, "Invalid proof format");
  assertThrows(() => Proof.parse("null"), Error, "Invalid proof format");

  const adjust = (key: string, value: unknown) => {
    const data = JSON.parse(json);
    data[key] = value;
    return JSON.stringify(data);
  };

  // Parse invalid version
  assertThrows(
    () => Proof.parse(adjust("version", undefined)),
    Error,
    "Missing proof version",
  );
  assertThrows(
    () => Proof.parse(adjust("version", "1.0")),
    Error,
    "Invalid proof version",
  );
  assertThrows(
    () => Proof.parse(adjust("version", 12.5)),
    Error,
    "Invalid proof version",
  );
  assertThrows(
    () => Proof.parse(adjust("version", -1)),
    Error,
    "Invalid proof version",
  );

  // Parse unsupported version
  assertThrows(
    () => Proof.parse(adjust("version", Proof.VERSION + 1)),
    Error,
    "Unsupported proof version",
  );

  // Parse with invalid operations
  assertThrows(
    () => Proof.parse(adjust("ops", undefined)),
    Error,
    "Missing operations array",
  );
  assertThrows(
    () => Proof.parse(adjust("ops", [])),
    Error,
    "Empty operations array",
  );
  assertThrows(
    () => Proof.parse(adjust("ops", ["single-layer-array"])),
    Error,
    "Invalid operation",
  );
  assertThrows(
    () => Proof.parse(adjust("ops", [[]])),
    Error,
    "Invalid operation",
  );
  assertThrows(
    () => Proof.parse(adjust("ops", [["unsupported-op"]])),
    Error,
    "Unsupported operation",
  );

  // Parse with missing network field
  assertThrows(
    () => Proof.parse(adjust("network", undefined)),
    Error,
    "Missing network ID",
  );
});

Deno.test("Derive block from proof", () => {
  const json = JSON.stringify(helloProof);
  const proof = Proof.parse(json);
  const bytes = new Uint8Array([104, 101, 108, 108, 111]);
  const input = new Uint8Array(
    createHash("sha256")
      .update(bytes)
      .digest(),
  );
  const blockHash = proof.derive(input);
  assertEquals(
    blockHash,
    // deno-fmt-ignore
    new Uint8Array([
       64, 167, 173,  57, 179, 254, 123, 171,
       45,  55, 232,  18,  81,  48, 249, 132,
      217, 205, 174,  25, 197,  65,  81,   2,
      158,  81, 104, 103,  55,  67, 134, 121
    ]),
  );
});
