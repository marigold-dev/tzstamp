import {
  Blake2bOperation,
  Blake2bTemplate,
  JoinOperation,
  JoinTemplate,
  Operation,
  Sha256Operation,
  Sha256Template,
} from "./operation.ts";
import { InvalidTemplateError, UnsupportedOperationError } from "./errors.ts";
import { Blake2b, concat, Hex, Sha256 } from "./deps.ts";
import { assertEquals, assertThrows } from "./dev_deps.ts";

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
  name: "Join operation",
  fn() {
    const prepend = crypto.getRandomValues(new Uint8Array(16));
    const append = crypto.getRandomValues(new Uint8Array(16));
    const wrapOp = new JoinOperation({ prepend, append });
    const wrapTemplate: JoinTemplate = {
      type: "join",
      prepend: Hex.stringify(prepend),
      append: Hex.stringify(append),
    };
    const prependOp = new JoinOperation({ prepend });
    const prependTemplate: JoinTemplate = {
      type: "join",
      prepend: Hex.stringify(prepend),
    };
    const appendOp = new JoinOperation({ append });
    const appendTemplate: JoinTemplate = {
      type: "join",
      append: Hex.stringify(append),
    };
    const nullOp = new JoinOperation({});
    const nullTemplate: JoinTemplate = {
      type: "join",
    };
    assertEquals(wrapOp.prepend, prepend);
    assertEquals(wrapOp.append, append);
    assertEquals(nullOp.prepend, new Uint8Array());
    assertEquals(nullOp.append, new Uint8Array());
    assertEquals(
      wrapOp.toString(),
      `Prepend 0x${Hex.stringify(prepend)}, Append 0x${Hex.stringify(append)}`,
    );
    assertEquals(prependOp.toString(), `Prepend 0x${Hex.stringify(prepend)}`);
    assertEquals(appendOp.toString(), `Append 0x${Hex.stringify(append)}`);
    assertEquals(nullOp.toString(), "");
    assertEquals(
      wrapOp.commit(new Uint8Array([67])),
      concat(prepend, 67, append),
    );
    assertEquals(
      prependOp.commit(new Uint8Array([39])),
      concat(prepend, 39),
    );
    assertEquals(
      appendOp.commit(new Uint8Array([244])),
      concat(244, append),
    );
    assertEquals(
      nullOp.commit(new Uint8Array([132])),
      new Uint8Array([132]),
    );
    assertEquals(wrapOp.toJSON(), wrapTemplate);
    assertEquals(prependOp.toJSON(), prependTemplate);
    assertEquals(appendOp.toJSON(), appendTemplate);
    assertEquals(nullOp.toJSON(), nullTemplate);
    assertEquals(wrapOp, Operation.from(wrapTemplate));
    assertEquals(prependOp, Operation.from(prependTemplate));
    assertEquals(appendOp, Operation.from(appendTemplate));
    assertEquals(nullOp, Operation.from(nullTemplate));
  },
});

Deno.test({
  name: "BLAKE2b hash operation",
  fn() {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const input = crypto.getRandomValues(new Uint8Array(32));
    const lenKeyOp = new Blake2bOperation(64, key);
    const lenKeyTemplate: Blake2bTemplate = {
      type: "blake2b",
      length: 64,
      key: Hex.stringify(key),
    };
    const lenOp = new Blake2bOperation(44);
    const lenTemplate: Blake2bTemplate = {
      type: "blake2b",
      length: 44,
    };
    const keyOp = new Blake2bOperation(undefined, key);
    const keyTemplate: Blake2bTemplate = {
      type: "blake2b",
      key: Hex.stringify(key),
    };
    const defaultOp = new Blake2bOperation();
    const defaultTemplate: Blake2bTemplate = { type: "blake2b" };
    assertEquals(lenKeyOp.length, 64);
    assertEquals(lenOp.length, 44);
    assertEquals(keyOp.length, 32);
    assertEquals(keyOp.key, key);
    assertEquals(
      lenKeyOp.toString(),
      `BLAKE2b hash, 64-byte digest with key 0x${Hex.stringify(key)}`,
    );
    assertEquals(
      lenOp.toString(),
      "BLAKE2b hash, 44-byte digest",
    );
    assertEquals(
      keyOp.toString(),
      `BLAKE2b hash, 32-byte digest with key 0x${Hex.stringify(key)}`,
    );
    assertEquals(
      defaultOp.toString(),
      "BLAKE2b hash, 32-byte digest",
    );
    assertEquals(
      lenKeyOp.commit(input),
      new Blake2b(key, 64).update(input).digest(),
    );
    assertEquals(
      lenOp.commit(input),
      new Blake2b(undefined, 44).update(input).digest(),
    );
    assertEquals(
      keyOp.commit(input),
      new Blake2b(key, 32).update(input).digest(),
    );
    assertEquals(
      defaultOp.commit(input),
      new Blake2b().update(input).digest(),
    );
    assertEquals(lenKeyOp.toJSON(), lenKeyTemplate);
    assertEquals(lenOp.toJSON(), lenTemplate);
    assertEquals(keyOp.toJSON(), keyTemplate);
    assertEquals(defaultOp.toJSON(), defaultTemplate);
    assertEquals(lenKeyOp, Operation.from(lenKeyTemplate));
    assertEquals(lenOp, Operation.from(lenTemplate));
    assertEquals(keyOp, Operation.from(keyTemplate));
    assertEquals(defaultOp, Operation.from(defaultTemplate));
    assertThrows(
      () => new Blake2bOperation(-1),
      RangeError,
    );
    assertThrows(
      () => new Blake2bOperation(65),
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
      Sha256.digest(input),
    );
    assertEquals(op.toJSON(), template);
    assertEquals(op, Operation.from(template));
  },
});
