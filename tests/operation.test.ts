import {
  Blake2bOperation,
  Blake2bTemplate,
  JoinOperation,
  JoinTemplate,
  Operation,
  Sha256Operation,
  Sha256Template,
} from "../src/operation.ts";
import {
  InvalidTemplateError,
  UnsupportedOperationError,
} from "../src/errors.ts";
import { Blake2b, Hex } from "../src/deps.deno.ts";
import {
  assertEquals,
  assertStrictEquals,
  assertThrows,
  createHash,
} from "./dev_deps.ts";

Deno.test({
  name: "Invalid operation templating",
  fn() {
    assertThrows(
      () => Operation.from(null),
      InvalidTemplateError,
    );
    assertThrows(
      () => Operation.from({}),
      InvalidTemplateError,
    );
    assertThrows(
      () => Operation.from({ type: "join", foo: true }),
      InvalidTemplateError,
    );
    assertThrows(
      () => Operation.from({ type: "blake2b", foo: true }),
      InvalidTemplateError,
    );
    assertThrows(
      () => Operation.from({ type: "sha256", foo: true }),
      InvalidTemplateError,
    );
    assertThrows(
      () => Operation.from({ type: "bogus" }),
      UnsupportedOperationError,
    );
  },
});

Deno.test({
  name: "Prepending join operation",
  fn() {
    const op = new JoinOperation({
      prepend: new Uint8Array([0, 17, 34, 51]),
    });
    const template: JoinTemplate = {
      type: "join",
      prepend: "00112233",
    };
    assertEquals(op.prepend, new Uint8Array([0, 17, 34, 51]));
    assertStrictEquals(op.append, undefined);
    assertEquals(op.toString(), "Prepend 0x00112233");
    assertEquals(
      op.commit(new Uint8Array([67])),
      new Uint8Array([0, 17, 34, 51, 67]),
    );
    assertEquals(op.toJSON(), template);
    assertEquals(op, Operation.from(template));
  },
});

Deno.test({
  name: "Appending join operation",
  fn() {
    const op = new JoinOperation({
      append: new Uint8Array([136, 68, 255]),
    });
    const template: JoinTemplate = {
      type: "join",
      append: "8844ff",
    };
    assertStrictEquals(op.prepend, undefined);
    assertEquals(op.append, new Uint8Array([136, 68, 255]));
    assertEquals(op.toString(), "Append 0x8844ff");
    assertEquals(
      op.commit(new Uint8Array([0, 0, 1])),
      new Uint8Array([0, 0, 1, 136, 68, 255]),
    );
    assertEquals(op.toJSON(), template);
    assertEquals(op, Operation.from(template));
  },
});

Deno.test({
  name: "Wrapping join operation",
  fn() {
    const op = new JoinOperation({
      prepend: new Uint8Array([0, 17, 34, 51]),
      append: new Uint8Array([136, 68, 255]),
    });
    const template: JoinTemplate = {
      type: "join",
      prepend: "00112233",
      append: "8844ff",
    };
    assertEquals(op.prepend, new Uint8Array([0, 17, 34, 51]));
    assertEquals(op.append, new Uint8Array([136, 68, 255]));
    assertEquals(op.toString(), "Prepend 0x00112233, and Append 0x8844ff");
    assertEquals(
      op.commit(new Uint8Array([66, 77, 88, 99])),
      new Uint8Array([0, 17, 34, 51, 66, 77, 88, 99, 136, 68, 255]),
    );
    assertEquals(op.toJSON(), template);
    assertEquals(op, Operation.from(template));
  },
});

Deno.test({
  name: "BLAKE2b hash operation with all defaults",
  fn() {
    const op = new Blake2bOperation();
    const input = crypto.getRandomValues(new Uint8Array(32));
    const template: Blake2bTemplate = { type: "blake2b" };
    assertEquals(op.length, 32);
    assertEquals(op.key, undefined);
    assertEquals(
      op.toString(),
      "BLAKE2b hash, 32-byte digest",
    );
    assertEquals(
      op.commit(input),
      new Blake2b(32).update(input).digest(),
    );
    assertEquals(op.toJSON(), template);
    assertEquals(op, Operation.from(template));
  },
});

Deno.test({
  name: "BLAKE2b hash operation with 64-byte digest length",
  fn() {
    const op = new Blake2bOperation(64);
    const input = crypto.getRandomValues(new Uint8Array(32));
    const template: Blake2bTemplate = {
      type: "blake2b",
      length: 64,
    };
    assertEquals(op.length, 64);
    assertEquals(op.key, undefined);
    assertEquals(
      op.toString(),
      "BLAKE2b hash, 64-byte digest",
    );
    assertEquals(
      op.commit(input),
      new Blake2b(64).update(input).digest(),
    );
    assertEquals(op.toJSON(), template);
    assertEquals(op, Operation.from(template));
  },
});

Deno.test({
  name: "BLAKE2b keyed hash operation",
  fn() {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const op = new Blake2bOperation(undefined, key);
    const input = crypto.getRandomValues(new Uint8Array(32));
    const template: Blake2bTemplate = {
      type: "blake2b",
      key: Hex.stringify(key),
    };
    assertEquals(op.length, 32);
    assertEquals(op.key, key);
    assertEquals(
      op.toString(),
      `BLAKE2b hash, 32-byte digest with key 0x${Hex.stringify(key)}`,
    );
    assertEquals(
      op.commit(input),
      new Blake2b(32, key).update(input).digest(),
    );
    assertEquals(op.toJSON(), template);
    assertEquals(op, Operation.from(template));
  },
});

Deno.test({
  name: "Invalid BLAKE2b hash operation construction",
  fn() {
    assertThrows(
      () => new Blake2bOperation(0),
      RangeError,
    );
    assertThrows(
      () => new Blake2bOperation(65),
      RangeError,
    );
    assertThrows(
      () => new Blake2bOperation(undefined, new Uint8Array(0)),
      RangeError,
    );
    assertThrows(
      () => new Blake2bOperation(undefined, new Uint8Array(65)),
      RangeError,
    );
  },
});

Deno.test({
  name: "SHA-256 hash operation",
  fn() {
    const op = new Sha256Operation();
    const input = crypto.getRandomValues(new Uint8Array(32));
    const template: Sha256Template = { type: "sha256" };
    assertEquals(op.toString(), "SHA-256 hash");
    assertEquals(
      op.commit(input),
      new Uint8Array(createHash("sha256").update(input).digest()),
    );
    assertEquals(op.toJSON(), template);
    assertEquals(op, Operation.from(template));
  },
});
