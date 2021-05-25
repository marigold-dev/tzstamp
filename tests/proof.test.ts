import {
  Blake2bOperation,
  JoinOperation,
  Proof,
  Sha256Operation,
} from "../src/mod.ts";
import { assert, assertEquals, assertThrows } from "./dev_deps.ts";

Deno.test("Proof construction", () => {
  // Correct proofs
  new Proof({
    network: "NetXdQprcVkpaWU",
    operations: [],
  });
  new Proof({ operations: [] });
  new Proof({});
  new Proof();

  // Invalid network IDs
  assertThrows(() => new Proof({ network: "$=" }));
  assertThrows(() => new Proof({ network: "abc" }));
  assertThrows(() => new Proof({ network: "2LVJ4JR2W" }));
  assertThrows(() => new Proof({ network: "NsA1RF51pJCZxfm" }));
});

Deno.test({
  name: "Proof serialization",
  fn() {
    // Serialization with latest version
    assertEquals(
      JSON.stringify(
        new Proof({
          operations: [
            new JoinOperation(new Uint8Array([1])),
            new JoinOperation(new Uint8Array([2]), true),
            new Sha256Operation(),
            new Blake2bOperation(),
          ],
          // deno-fmt-ignore
          hash: new Uint8Array([
            199, 131, 165, 147, 208, 116, 212, 119,
            221, 131,  22, 215, 110, 245,  64, 118,
            143,  15,  11,  51, 198, 212,  10, 215,
            139,  98,  20, 121, 138, 185, 128, 215,
          ]),
          timestamp: new Date(0),
          network: "NetXdQprcVkpaWU",
        }),
      ),
      JSON.stringify({
        version: 1,
        operations: [
          { type: "append", data: "01" },
          { type: "prepend", data: "02" },
          { type: "sha256" },
          { type: "blake2b" },
        ],
        hash:
          "c783a593d074d477dd8316d76ef540768f0f0b33c6d40ad78b6214798ab980d7",
        timestamp: "1970-01-01T00:00:00.000Z",
        network: "NetXdQprcVkpaWU",
      }),
    );
  },
});

Deno.test({
  name: "Parsing bad template",
  fn() {
    assertThrows(() => Proof.from(null));
    assertThrows(() => Proof.from({}));
    assertThrows(() =>
      Proof.from({
        version: -1,
      })
    );
    assertThrows(() =>
      Proof.from({
        version: 10000,
      })
    );
  },
});

Deno.test({
  name: "Parsing version 0 proofs",
  fn() {
    const proof = Proof.from({
      version: 0,
      network: "NetXdQprcVkpaWU",
      ops: [
        ["append", "01"],
        ["prepend", "02"],
        ["sha-256"],
        ["blake2b"],
      ],
    });
    assertEquals(proof.network, "NetXdQprcVkpaWU");
    assertEquals(proof.operations?.length, 4);
    assert(proof.operations?.[0] instanceof JoinOperation);
    assert(proof.operations?.[1] instanceof JoinOperation);
    assert(proof.operations?.[2] instanceof Sha256Operation);
    assert(proof.operations?.[3] instanceof Blake2bOperation);

    // Bad templates
    assertThrows(() =>
      Proof.from({
        version: 0,
        network: "NetXdQprcVkpaWU",
        ops: [],
        bogus: true,
      })
    );
    assertThrows(() =>
      Proof.from({
        version: 0,
        network: "NetXdQprcVkpaWU",
        ops: [
          ["bogus"],
        ],
      })
    );
  },
});

Deno.test({
  name: "Parsing version 1 proofs",
  fn() {
    const proof = Proof.from({
      version: 1,
      operations: [
        { type: "append", data: "01" },
        { type: "sha256" },
        { type: "blake2b", length: 64, key: "01" },
      ],
      hash: "001122",
      timestamp: "2021-01-01T08:00:00.000Z",
      network: "NetXdQprcVkpaWU",
    });
    assertEquals(proof.operations?.length, 3);
    assert(proof.operations?.[0] instanceof JoinOperation);
    assert(proof.operations?.[1] instanceof Sha256Operation);
    assert(proof.operations?.[2] instanceof Blake2bOperation);
    assertEquals(proof.hash, new Uint8Array([0, 17, 34]));
    assertEquals(proof.timestamp, new Date("Jan 1 2021"));
    assertEquals(proof.network, "NetXdQprcVkpaWU");

    // Bad templates
    assertThrows(() =>
      Proof.from({
        version: 1,
        bogus: true,
      })
    );
    assertThrows(() =>
      Proof.from({
        version: 1,
        operations: [
          { type: "bogus" },
        ],
      })
    );
    assertThrows(() =>
      Proof.from({
        version: 1,
        operations: [],
        hash: "invalid",
      })
    );
  },
});

Deno.test("Derive proof", () => {
  assertEquals(
    new Proof({
      operations: [
        new JoinOperation(new Uint8Array([1, 2]), true),
        new JoinOperation(new Uint8Array([3, 4])),
        new Blake2bOperation(64, new Uint8Array([1])),
        new Sha256Operation(),
      ],
    }).derive(new Uint8Array([255])),
    // deno-fmt-ignore
    new Uint8Array([
      141,  45,  57, 123, 230, 192, 191, 100,
       10, 151, 253,  96, 117, 189,   8,  81,
      112,  42, 219,  28, 213, 147, 249, 251,
      154,  73, 251, 166, 194,   3, 155, 123,
    ]),
  );
  const randomBytes = crypto.getRandomValues(new Uint8Array(64));
  assertEquals(
    new Proof({ operations: [], hash: randomBytes }).derive(randomBytes),
    randomBytes,
  );
  assertThrows(
    () =>
      new Proof({ operations: [], hash: new Uint8Array([]) })
        .derive(randomBytes),
  );
  assertEquals(new Proof().derive(randomBytes), randomBytes);
});
