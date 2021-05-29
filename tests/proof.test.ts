import { Proof, ProofTemplate, VerificationStatus } from "../src/proof.ts";
import {
  InvalidTemplateError,
  MismatchedHashError,
  MismatchedNetworkError,
  MismatchedTimestampError,
  UnallowedOperationError,
  UnsupportedVersionError,
} from "../src/errors.ts";
import {
  AffixOperation,
  Blake2bOperation,
  JoinOperation,
  Sha256Operation,
} from "../src/operation.ts";
import { Base58, Blake2b, concat, Hex } from "../src/deps.deno.ts";
import {
  assert,
  assertEquals,
  assertStrictEquals,
  assertThrows,
} from "./dev_deps.ts";

Deno.test({
  name: "Unaffixed proof construction",
  fn() {
    const input = crypto.getRandomValues(new Uint8Array(32));
    const proof = new Proof(input, []);
    assert(!proof.isAffixedToOperation);
    assert(!proof.isAffixedToBlock);
    assertEquals(proof.derivation, input);
    assertStrictEquals(proof.operationHash, null);
    assertStrictEquals(proof.blockHash, null);
    assertStrictEquals(proof.timestamp, null);
  },
});

Deno.test({
  name: "Operation-level affixed proof construction",
  fn() {
    const input = crypto.getRandomValues(new Uint8Array(32));
    const proof = new Proof(input, [
      new AffixOperation(
        "NetXdQprcVkpaWU",
        "operation",
        new Date("1970-01-01T00:00:00.000Z"),
      ),
    ]);
    assert(proof.isAffixedToOperation);
    assert(!proof.isAffixedToBlock);
    assertEquals(proof.derivation, input);
    assertEquals(
      proof.operationHash,
      Base58.encodeCheck(concat(
        new Uint8Array([5, 116]),
        input,
      )),
    );
    assertStrictEquals(proof.blockHash, null);
    assertEquals(proof.timestamp, new Date("1970-01-01T00:00:00.000Z"));
  },
});

Deno.test({
  name: "Block-level affixed proof construction",
  fn() {
    const input = crypto.getRandomValues(new Uint8Array(32));
    const proof = new Proof(input, [
      new AffixOperation(
        "NetXdQprcVkpaWU",
        "block",
        new Date("1970-01-01T00:00:00.000Z"),
      ),
    ]);
    assert(!proof.isAffixedToOperation);
    assert(proof.isAffixedToBlock);
    assertEquals(proof.derivation, input);
    assertStrictEquals(proof.operationHash, null);
    assertEquals(
      proof.blockHash,
      Base58.encodeCheck(concat(
        new Uint8Array([1, 52]),
        input,
      )),
    );
    assertEquals(proof.timestamp, new Date("1970-01-01T00:00:00.000Z"));
  },
});

Deno.test({
  name: "Dual affixed proof construction",
  fn() {
    const input = crypto.getRandomValues(new Uint8Array(32));
    const proof = new Proof(input, [
      new AffixOperation(
        "NetXdQprcVkpaWU",
        "operation",
        new Date("1970-01-01T00:00:00.000Z"),
      ),
      new AffixOperation(
        "NetXdQprcVkpaWU",
        "block",
        new Date("1970-01-01T00:00:00.000Z"),
      ),
    ]);
    assert(proof.isAffixedToOperation);
    assert(proof.isAffixedToBlock);
    assertEquals(proof.derivation, input);
    assertEquals(
      proof.operationHash,
      Base58.encodeCheck(concat(
        new Uint8Array([5, 116]),
        input,
      )),
    );
    assertEquals(
      proof.blockHash,
      Base58.encodeCheck(concat(
        new Uint8Array([1, 52]),
        input,
      )),
    );
    assertEquals(proof.timestamp, new Date("1970-01-01T00:00:00.000Z"));
  },
});

Deno.test({
  name: "Invalid proof construction",
  fn() {
    const input = crypto.getRandomValues(new Uint8Array(32));
    assertThrows(
      () =>
        new Proof(input, [
          new AffixOperation("NetXdQprcVkpaWU", "block", new Date()),
          new Sha256Operation(),
        ]),
      UnallowedOperationError,
    );
    assertThrows(
      () =>
        new Proof(input, [
          new AffixOperation("NetXdQprcVkpaWU", "operation", new Date(0)),
          new AffixOperation("NetXdQprcVkpaWU", "operation", new Date(0)),
        ]),
      UnallowedOperationError,
    );
    assertThrows(
      () =>
        new Proof(input, [
          new AffixOperation("NetXdQprcVkpaWU", "operation", new Date(0)),
          new AffixOperation("NetXdQprcVkpaWU", "block", new Date(1)),
        ]),
      MismatchedTimestampError,
    );
    assertThrows(
      () =>
        new Proof(input, [
          new AffixOperation("NetXH12Aer3be93", "operation", new Date(0)),
          new AffixOperation("NetXdQprcVkpaWU", "block", new Date(0)),
        ]),
      MismatchedNetworkError,
    );
  },
});

Deno.test({
  name: "Proof templating",
  fn() {
    const input = crypto.getRandomValues(new Uint8Array(32));
    const proof = new Proof(input, [
      new JoinOperation(new Uint8Array([1])),
      new JoinOperation(new Uint8Array([2]), true),
      new Blake2bOperation(),
      new Sha256Operation(),
    ]);
    const template: ProofTemplate = {
      version: 1,
      hash: Hex.stringify(input),
      operations: [
        { type: "append", data: "01" },
        { type: "prepend", data: "02" },
        { type: "blake2b" },
        { type: "sha256" },
      ],
    };
    assertEquals(proof.toJSON(), template);
    assertEquals(proof, Proof.from(template));
  },
});

Deno.test({
  name: "Invalid proof templating",
  fn() {
    assertThrows(
      () => Proof.from(null),
      InvalidTemplateError,
    );
    assertThrows(
      () => Proof.from({}),
      InvalidTemplateError,
    );
    assertThrows(
      () =>
        Proof.from({
          version: 0,
          hash: "0",
          operations: [],
        }),
      UnsupportedVersionError,
    );
    assertThrows(
      () =>
        Proof.from({
          version: 10000,
          hash: "0",
          operations: [],
        }),
      UnsupportedVersionError,
    );
    assertThrows(
      () =>
        Proof.from({
          version: 1,
          hash: "invalid",
          operations: [],
        }),
      SyntaxError,
    );
  },
});

Deno.test({
  name: "Proof verification",
  permissions: {
    net: true,
  },
  async fn() {
    const input = new TextEncoder().encode("hello");
    const rpcURL = "https://mainnet-tezos.giganode.io";
    const proof = new Proof(input, [
      new Sha256Operation(),
      new Blake2bOperation(),
      new JoinOperation(
        Hex.parse(
          "20e1b3c539e05c6111808d3bd652a635ea150aea335924f988c70330190db4b06c00beecbe835743f728d201cb09c1e156ea4bc27fd28605c9a6b904c718000001732e5f09bfbe1d94211369d4ec6decd055b9baf500ff00000000250a00000020",
        ),
        true,
      ),
      new JoinOperation(
        Hex.parse(
          "f1616cc12b657850aaa19c59c8e530193e97e4253bb20b24aa72d2696d5c2cf22fa9c84df7d16478c9247bda7abe93b5957ed3754a86bfa16dfc8084bba58b00",
        ),
      ),
      new Blake2bOperation(),
      new Blake2bOperation(),
      new JoinOperation(
        Hex.parse(
          "d29581ecd9c10ceef2edaa4c58d7a38ccd438ddc5797190ee87db13898111719",
        ),
      ),
      new Blake2bOperation(),
      new JoinOperation(
        Hex.parse(
          "10a3d1f3e09642bfef6efde49ac7879b1e9f7b0ef071e3e7b7652f4fb8e24306",
        ),
        true,
      ),
      new Blake2bOperation(),
      new JoinOperation(
        Hex.parse(
          "a3a12576f7f60b4ebd771129cdb0b17acd7a997a24119b37c1bb57cca83ef1cd",
        ),
      ),
      new Blake2bOperation(),
      new JoinOperation(
        Hex.parse(
          "45423d52d1a5272f33ee16d9c652c17cdf97f525a087d8b999f45026ef0a6765",
        ),
      ),
      new Blake2bOperation(),
      new JoinOperation(
        Hex.parse(
          "a42cba2c7a92dd4680bfd6e2a52f16cd0282ecf4af13167bd12e91166ec1d2bb",
        ),
      ),
      new Blake2bOperation(),
      new JoinOperation(
        Hex.parse(
          "dc417b0eae7ced3ba25cd4fcf85396944429190725b41b82a2f0e73b8afabc9c",
        ),
      ),
      new Blake2bOperation(),
      new Blake2bOperation(),
      new JoinOperation(
        Hex.parse(
          "7c09f7c4d76ace86e1a7e1c7dc0a0c7edcaa8b284949320081131976a87760c3",
        ),
        true,
      ),
      new Blake2bOperation(),
      new JoinOperation(
        Hex.parse(
          "748ee32bc2ff8c555a9afeb9555ea642eaf83347e6fec3ab71b353283cc429c3",
        ),
        true,
      ),
      new Blake2bOperation(),
      new JoinOperation(
        Hex.parse(
          "0016c6170920e1b3c539e05c6111808d3bd652a635ea150aea335924f988c70330190db4b00000000060b2423204",
        ),
        true,
      ),
      new JoinOperation(
        Hex.parse(
          "0000001100000001010000000800000000000cc617a5c0f073fac81447cc837bb3227cf77f7a80f6d8f5a4318e84cc44dc19523f68000031e6641d3f12000000c0ce4e82998e20b9accae6443c3533c6e2375429cf341e91047100bec6b7003d1804af1077b71cae0d80e48d5fa7373424d31fa014555d62f5ec479b0380e708",
        ),
      ),
      new Blake2bOperation(),
      new AffixOperation(
        "NetXdQprcVkpaWU",
        "block",
        new Date("2021-05-29T13:31:30.000Z"),
      ),
    ]);
    assert(proof.isAffixedToBlock);
    assertEquals(
      await proof.verify(rpcURL),
      VerificationStatus.Verified,
    );
  },
});

Deno.test({
  name: "Proof concatenation",
  fn() {
    const inputA = crypto.getRandomValues(new Uint8Array(32));
    const inputB = new Blake2b().update(inputA).digest();
    const proofA = new Proof(inputA, [new Blake2bOperation()]);
    const proofB = new Proof(inputB, [new Blake2bOperation()]);
    const proofAB = proofA.concat(proofB);
    assertEquals(proofAB.hash, proofA.hash);
    assertEquals(
      proofAB.operations,
      proofA.operations.concat(proofB.operations),
    );
    assertEquals(
      proofAB.derivation,
      new Blake2b().update(inputB).digest(),
    );
    assertThrows(
      () => proofA.concat(new Proof(inputA, [])),
      MismatchedHashError,
    );
  },
});
