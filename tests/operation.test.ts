import {
  Blake2bOperation,
  JoinOperation,
  Operation,
  Sha256Operation,
} from "../src/mod.ts";
import { isValid } from "../src/_validate.ts";
import { assert, assertEquals, assertThrows } from "./dev_deps.ts";

Deno.test({
  name: "Operation templating",
  fn() {
    assertThrows(() => Operation.from({}));
    assertThrows(() => Operation.from({ type: "bogus" }));
    const appendOp = Operation.from({
      type: "append",
      data: "00",
    });
    assert(appendOp instanceof JoinOperation);
    const prependOp = Operation.from({
      type: "prepend",
      data: "00",
    });
    assert(prependOp instanceof JoinOperation);
    const blake2bOp = Operation.from({
      type: "blake2b",
      length: 32,
      key: "00",
    });
    assert(blake2bOp instanceof Blake2bOperation);
    const sha256Op = Operation.from({
      type: "sha256",
    });
    assert(sha256Op instanceof Sha256Operation);
  },
});

Deno.test({
  name: "Join operation",
  fn() {
    // Templating
    const prependOp = JoinOperation.from({
      type: "prepend",
      data: "00112233",
    });
    const appendOp = JoinOperation.from({
      type: "append",
      data: "8844ff",
    });
    assert(prependOp.prepend);
    assert(!appendOp.prepend);
    assertThrows(() => JoinOperation.from({ type: "prepend" }));
    assertThrows(() => JoinOperation.from({ type: "append" }));
    assertThrows(() =>
      JoinOperation.from({
        type: "bogus",
        data: "00",
      })
    );

    // Cast to string
    assertEquals(prependOp.toString(), "Prepend 0x00112233");
    assertEquals(appendOp.toString(), "Append 0x8844ff");

    // Commit operation
    assertEquals(
      prependOp.commit(new Uint8Array([67])),
      new Uint8Array([0, 17, 34, 51, 67]),
    );
    assertEquals(
      appendOp.commit(new Uint8Array([0, 0, 1])),
      new Uint8Array([0, 0, 1, 136, 68, 255]),
    );

    // Serialization
    const prependTemplate = prependOp.toJSON();
    const appendTemplate = appendOp.toJSON();
    assert(isValid(JoinOperation.schema, prependTemplate));
    assert(isValid(JoinOperation.schema, appendTemplate));
    assertEquals(prependTemplate.type, "prepend");
    assertEquals(appendTemplate.type, "append");
  },
});

Deno.test({
  name: "BLAKE2b hash operation",
  fn() {
    // Construction
    assertThrows(() => new Blake2bOperation(0));
    assertThrows(() => new Blake2bOperation(65));
    assertThrows(() => new Blake2bOperation(undefined, new Uint8Array(0)));
    assertThrows(() => new Blake2bOperation(undefined, new Uint8Array(65)));

    // Templating
    const defaultsOp = Blake2bOperation.from({ type: "blake2b" });
    const keyedOp = Blake2bOperation.from({
      type: "blake2b",
      length: 40,
      key: "01020304",
    });
    assertThrows(() => Blake2bOperation.from({ type: "bogus" }));

    // Cast to string
    assertEquals(
      defaultsOp.toString(),
      "BLAKE2b hash, 32-byte digest",
    );
    assertEquals(
      keyedOp.toString(),
      "BLAKE2b hash, 40-byte digest with key 0x01020304",
    );

    // Commit operation
    assertEquals(
      defaultsOp.commit(new Uint8Array([104, 101, 108, 108, 111])),
      // deno-fmt-ignore
      new Uint8Array([
         50,  77, 207,   2, 125, 212, 163,  10,
        147,  44,  68,  31,  54,  90,  37, 232,
        107,  23,  61, 239, 164, 184, 229, 137,
         72,  37,  52, 113, 184,  27, 114, 207,
      ]),
    );
    assertEquals(
      keyedOp.commit(new Uint8Array([104, 101, 108, 108, 111])),
      // deno-fmt-ignore
      new Uint8Array([
        197,  80, 206, 133, 185,  11, 243, 246,
         74,  17, 167,  59, 171,  24, 236,  78,
        186, 158,  64, 157, 162, 226, 128, 253,
        115, 249, 199,  44,  73, 105,  61, 192,
        243, 129,  51,  81, 150, 188,  28, 171,
      ]),
    );

    // Serialization
    const defaultsTemplate = defaultsOp.toJSON();
    const keyedTemplate = keyedOp.toJSON();
    assert(isValid(Blake2bOperation.schema, defaultsTemplate));
    assert(isValid(Blake2bOperation.schema, keyedTemplate));
    assertEquals(defaultsTemplate.type, "blake2b");
    assertEquals(keyedTemplate.type, "blake2b");
    assertEquals(defaultsTemplate.length, undefined);
    assertEquals(keyedTemplate.length, 40);
    assertEquals(defaultsTemplate.key, undefined);
    assertEquals(keyedTemplate.key, "01020304");
  },
});

Deno.test({
  name: "SHA-256 hash operation",
  fn() {
    const op = new Sha256Operation();

    // Cast to string
    assertEquals(op.toString(), "SHA-256 hash");

    // Commit operation
    assertEquals(
      op.commit(new Uint8Array([104, 101, 108, 108, 111])),
      // deno-fmt-ignore
      new Uint8Array([
         44, 242,  77, 186,  95, 176, 163,  14,
         38, 232,  59,  42, 197, 185, 226, 158,
         27,  22,  30,  92,  31, 167,  66,  94,
        115,   4,  51,  98, 147, 139, 152,  36,
      ]),
    );

    // Serialization
    const template = op.toJSON();
    assert(isValid(Operation.schema, template));
    assertEquals(template.type, "sha256");
  },
});
