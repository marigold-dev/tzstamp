import {
  AffixOperation,
  AffixTemplate,
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
  InvalidTezosNetworkError,
  UnsupportedOperationError,
} from "../src/errors.ts";
import { Blake2b, Hex } from "../src/deps.deno.ts";
import {
  assert,
  assertEquals,
  assertStrictEquals,
  assertThrows,
  createHash,
} from "./dev_deps.ts";

Deno.test({
  name: "Operation templating",
  fn() {
    assertThrows(
      () => Operation.from({}),
      InvalidTemplateError,
    );
    assert(
      Operation.from({
        type: "join",
      }) instanceof JoinOperation,
    );
    assert(
      Operation.from({
        type: "blake2b",
      }) instanceof Blake2bOperation,
    );
    assert(
      Operation.from({
        type: "sha256",
      }) instanceof Sha256Operation,
    );
    assert(
      Operation.from({
        type: "affix",
        network: "NetXdQprcVkpaWU",
        level: "block",
        timestamp: "1970-01-01T00:00:00.000Z",
      }) instanceof AffixOperation,
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
    assertEquals(op, JoinOperation.from(template));
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
    assertEquals(op, JoinOperation.from(template));
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
    assertEquals(op, JoinOperation.from(template));
  },
});

Deno.test({
  name: "Invalid join operation templating",
  fn() {
    assertThrows(
      () => JoinOperation.from({ type: "bogus" }),
      InvalidTemplateError,
    );
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
    assertEquals(op, Blake2bOperation.from(template));
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
    assertEquals(op, Blake2bOperation.from(template));
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
    assertEquals(op, Blake2bOperation.from(template));
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
  name: "Invalid BLAKE2b hash operation templating",
  fn() {
    assertThrows(
      () => Blake2bOperation.from({ type: "bogus" }),
      InvalidTemplateError,
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
    assertEquals(op, Sha256Operation.from(template));
  },
});

Deno.test({
  name: "Invalid SHA-256 hash operation templating",
  fn() {
    assertThrows(
      () => Sha256Operation.from({ type: "bogus" }),
      InvalidTemplateError,
    );
  },
});

Deno.test({
  name: "Mainnet block-level affixation operation",
  fn() {
    const network = "NetXdQprcVkpaWU";
    const level = "block";
    const timestamp = "1970-01-01T00:00:00.000Z";
    const localeTimestamp = new Date(timestamp).toLocaleString();
    const op = new AffixOperation(network, level, new Date(timestamp));
    const input = crypto.getRandomValues(new Uint8Array(32));
    const template: AffixTemplate = {
      type: "affix",
      network,
      level,
      timestamp,
    };
    assertEquals(op.network, network);
    assertEquals(op.level, level);
    assertEquals(op.timestamp, new Date(op.timestamp));
    assertEquals(
      op.toString(),
      `Affix to block hash on the Tezos Mainnet at ${localeTimestamp}`,
    );
    assertEquals(op.commit(input), input);
    assertEquals(op.toJSON(), template);
    assertEquals(op, AffixOperation.from(template));
  },
});

Deno.test({
  name: "Altnet operation-level affixation operation",
  fn() {
    const network = "NetXH12Aer3be93";
    const level = "operation";
    const timestamp = "1970-01-01T00:00:00.000Z";
    const localeTimestamp = new Date(timestamp).toLocaleString();
    const op = new AffixOperation(network, level, new Date(timestamp));
    const input = crypto.getRandomValues(new Uint8Array(32));
    const template: AffixTemplate = {
      type: "affix",
      network,
      level,
      timestamp,
    };
    assertEquals(op.network, network);
    assertEquals(op.level, level);
    assertEquals(op.timestamp, new Date(op.timestamp));
    assertEquals(
      op.toString(),
      `Affix to operation hash on alternate Tezos network "${network}" at ${localeTimestamp}`,
    );
    assertEquals(op.commit(input), input);
    assertEquals(op.toJSON(), template);
    assertEquals(op, AffixOperation.from(template));
  },
});

Deno.test({
  name: "Invalid Affixation operation templating",
  fn() {
    assertThrows(
      () => AffixOperation.from({ type: "bogus" }),
      InvalidTemplateError,
    );
    assertThrows(
      () =>
        AffixOperation.from({
          type: "affix",
          network: "NetXH12Aer3be93",
          level: "block",
          timestamp: "invalid",
        }),
      InvalidTemplateError,
    );
    assertThrows(
      () =>
        AffixOperation.from({
          type: "affix",
          network: "NetXH12Aer3be93",
          level: "invalid",
          timestamp: "1970-01-01T00:00:00.000Z",
        }),
      InvalidTemplateError,
    );
    assertThrows(
      () =>
        AffixOperation.from({
          type: "affix",
          network: "invalid",
          level: "block",
          timestamp: "1970-01-01T00:00:00.000Z",
        }),
    );
    assertThrows(
      () =>
        AffixOperation.from({
          type: "affix",
          network: "2eaEQdd69bmjibEQa",
          level: "block",
          timestamp: "1970-01-01T00:00:00.000Z",
        }),
      InvalidTezosNetworkError,
    );
    assertThrows(
      () =>
        AffixOperation.from({
          type: "affix",
          network: "MRFsrHWuD14mU9Y",
          level: "block",
          timestamp: "1970-01-01T00:00:00.000Z",
        }),
      InvalidTezosNetworkError,
    );
  },
});
