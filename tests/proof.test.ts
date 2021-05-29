import { Proof, ProofTemplate } from "../src/proof.ts";
import {
  InvalidTemplateError,
  MismatchedHashError,
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
  name: "Affixed proof construction",
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
