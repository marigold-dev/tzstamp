import { Proof, ProofTemplate } from "../src/proof.ts";
import {
  InvalidTemplateError,
  MismatchedHashError,
  UnsupportedVersionError,
} from "../src/errors.ts";
import {
  Blake2bOperation,
  JoinOperation,
  Sha256Operation,
} from "../src/operation.ts";
import { Blake2b, concat, Hex } from "../src/deps.deno.ts";
import { assertEquals, assertThrows, createHash } from "./dev_deps.ts";

Deno.test({
  name: "Proof construction",
  fn() {
    new Proof(new Uint8Array(), []);
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
  name: "Proof derivation",
  fn() {
    const input = crypto.getRandomValues(new Uint8Array(32));
    const appendData = crypto.getRandomValues(new Uint8Array(12));
    const proof = new Proof(input, [
      new Sha256Operation(),
      new JoinOperation(appendData),
      new Blake2bOperation(64),
    ]);
    assertEquals(
      proof.derive(input),
      new Blake2b(64).update(
        concat(
          new Uint8Array(createHash("sha256").update(input).digest()),
          appendData,
        ),
      ).digest(),
    );
    assertThrows(
      () => proof.derive(crypto.getRandomValues(new Uint8Array(32))),
      MismatchedHashError,
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
      proofAB.derive(inputA),
      new Blake2b().update(inputB).digest(),
    );
    assertThrows(
      () => proofA.concat(new Proof(inputA, [])),
      MismatchedHashError,
    );
  },
});
