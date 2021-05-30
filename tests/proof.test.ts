import {
  AffixedProof,
  AffixedProofTemplate,
  PendingProof,
  PendingProofTemplate,
  Proof,
  ProofTemplate,
  VerifyStatus,
} from "../src/proof.ts";
import {
  InvalidTemplateError,
  MismatchedHashError,
  UnsupportedVersionError,
} from "../src/errors.ts";
import {
  Blake2bOperation,
  JoinOperation,
  Operation,
  Sha256Operation,
} from "../src/operation.ts";
import { Base58, Blake2b, concat, Hex } from "../src/deps.deno.ts";
import {
  assert,
  assertEquals,
  assertThrows,
  assertThrowsAsync,
} from "./dev_deps.ts";

Deno.test({
  name: "Proof construction",
  fn() {
    const hash = crypto.getRandomValues(new Uint8Array(32));
    const operations: Operation[] = [
      new JoinOperation({
        append: new Uint8Array([1]),
      }),
    ];
    const proof = new Proof({ hash, operations });
    const template: ProofTemplate = {
      version: 1,
      hash: Hex.stringify(hash),
      operations: [{
        type: "join",
        append: "01",
      }],
    };
    assertEquals(proof.hash, hash);
    assertEquals(proof.operations, operations);
    assertEquals(
      proof.derivation,
      concat(hash, 1),
    );
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
  name: "Affixed proof construction",
  fn() {
    const hash = crypto.getRandomValues(new Uint8Array(32));
    const network = "NetXdQprcVkpaWU";
    const timestamp = new Date("1970-01-01T00:00:00.000Z");
    const proof = new AffixedProof({
      hash,
      operations: [
        new JoinOperation({
          prepend: new Uint8Array([2]),
        }),
      ],
      network,
      timestamp,
    });
    const template: AffixedProofTemplate = {
      version: 1,
      hash: Hex.stringify(hash),
      operations: [{
        type: "join",
        prepend: "02",
      }],
      network,
      timestamp: timestamp.toISOString(),
    };
    assertEquals(proof.network, network);
    assertEquals(proof.timestamp, timestamp);
    assert(proof.mainnet);
    assert(
      !(new AffixedProof({
        hash,
        operations: [],
        network: "NetXH12Aer3be93",
        timestamp,
      })).mainnet,
    );
    assertEquals(
      proof.blockHash,
      Base58.encodeCheck(concat(1, 52, proof.derivation)),
    );
    assertThrows(() => proof.concat(proof));
    assertEquals(proof.toJSON(), template);
    assertEquals(proof, Proof.from(template));
  },
});

Deno.test({
  name: "Affixed proof verification",
  permissions: {
    net: true,
  },
  sanitizeResources: false,
  async fn() {
    const hash = new TextEncoder().encode("hello");
    const operations: Operation[] = [
      new Sha256Operation(),
      new Blake2bOperation(),
      new JoinOperation({
        // deno-fmt-ignore
        prepend: new Uint8Array([
          32, 225, 179, 197,  57, 224,  92,  97,  17, 128, 141,  59, 214,  82, 166,  53,
          234,  21,  10, 234,  51,  89,  36, 249, 136, 199,   3,  48,  25,  13, 180, 176,
          108,   0, 190, 236, 190, 131,  87,  67, 247,  40, 210,   1, 203,   9, 193, 225,
          86, 234,  75, 194, 127, 210, 134,   5, 201, 166, 185,   4, 199,  24,   0,   0,
            1, 115,  46,  95,   9, 191, 190,  29, 148,  33,  19, 105, 212, 236, 109, 236,
          208,  85, 185, 186, 245,   0, 255,   0,   0,   0,   0,  37,  10,   0,   0,   0,
          32,
        ]),
        // deno-fmt-ignore
        append: new Uint8Array([
          241,  97, 108, 193,  43, 101, 120,  80, 170, 161, 156,  89, 200, 229,  48,  25,
          62, 151, 228,  37,  59, 178,  11,  36, 170, 114, 210, 105, 109,  92,  44, 242,
          47, 169, 200,  77, 247, 209, 100, 120, 201,  36, 123, 218, 122, 190, 147, 181,
          149, 126, 211, 117,  74, 134, 191, 161, 109, 252, 128, 132, 187, 165, 139,   0,
        ]),
      }),
      new Blake2bOperation(),
      new Blake2bOperation(),
      new JoinOperation({
        // deno-fmt-ignore
        append: new Uint8Array([
          210, 149, 129, 236, 217, 193,  12, 238, 242, 237, 170,  76,  88, 215, 163, 140,
          205,  67, 141, 220,  87, 151,  25,  14, 232, 125, 177,  56, 152,  17,  23,  25,
        ]),
      }),
      new Blake2bOperation(),
      new JoinOperation({
        // deno-fmt-ignore
        prepend: new Uint8Array([
          16, 163, 209, 243, 224, 150,  66, 191, 239, 110, 253, 228, 154, 199, 135, 155,
          30, 159, 123,  14, 240, 113, 227, 231, 183, 101,  47,  79, 184, 226,  67,   6,
        ]),
      }),
      new Blake2bOperation(),
      new JoinOperation({
        // deno-fmt-ignore
        append: new Uint8Array([
          163, 161,  37, 118, 247, 246,  11,  78, 189, 119,  17,  41, 205, 176, 177, 122,
          205, 122, 153, 122,  36,  17, 155,  55, 193, 187,  87, 204, 168,  62, 241, 205,
        ]),
      }),
      new Blake2bOperation(),
      new JoinOperation({
        // deno-fmt-ignore
        append: new Uint8Array([
          69,  66,  61,  82, 209, 165,  39,  47,  51, 238,  22, 217, 198,  82, 193, 124,
          223, 151, 245,  37, 160, 135, 216, 185, 153, 244,  80,  38, 239,  10, 103, 101,
        ]),
      }),
      new Blake2bOperation(),
      new JoinOperation({
        // deno-fmt-ignore
        append: new Uint8Array([
          164,  44, 186,  44, 122, 146, 221,  70, 128, 191, 214, 226, 165,  47,  22, 205,
            2, 130, 236, 244, 175,  19,  22, 123, 209,  46, 145,  22, 110, 193, 210, 187,
        ]),
      }),
      new Blake2bOperation(),
      new JoinOperation({
        // deno-fmt-ignore
        append: new Uint8Array([
          220,  65, 123,  14, 174, 124, 237,  59, 162,  92, 212, 252, 248,  83, 150, 148,
          68,  41,  25,   7,  37, 180,  27, 130, 162, 240, 231,  59, 138, 250, 188, 156,
        ]),
      }),
      new Blake2bOperation(),
      new Blake2bOperation(),
      new JoinOperation({
        // deno-fmt-ignore
        prepend: new Uint8Array([
          124,   9, 247, 196, 215, 106, 206, 134, 225, 167, 225, 199, 220,  10,  12, 126,
          220, 170, 139,  40,  73,  73,  50,   0, 129,  19,  25, 118, 168, 119,  96, 195,
        ]),
      }),
      new Blake2bOperation(),
      new JoinOperation({
        // deno-fmt-ignore
        prepend: new Uint8Array([
          116, 142, 227,  43, 194, 255, 140,  85,  90, 154, 254, 185,  85,  94, 166,  66,
          234, 248,  51,  71, 230, 254, 195, 171, 113, 179,  83,  40,  60, 196,  41, 195,
        ]),
      }),
      new Blake2bOperation(),
      new JoinOperation({
        // deno-fmt-ignore
        prepend: new Uint8Array([
            0,  22, 198,  23,   9,  32, 225, 179, 197,  57, 224,  92,  97,  17, 128, 141,
          59, 214,  82, 166,  53, 234,  21,  10, 234,  51,  89,  36, 249, 136, 199,   3,
          48,  25,  13, 180, 176,   0,   0,   0,   0,  96, 178,  66,  50,   4,
        ]),
        // deno-fmt-ignore
        append: new Uint8Array([
            0,   0,   0,  17,   0,   0,   0,   1,   1,   0,   0,   0,   8,   0,   0,   0,
            0,   0,  12, 198,  23, 165, 192, 240, 115, 250, 200,  20,  71, 204, 131, 123,
          179,  34, 124, 247, 127, 122, 128, 246, 216, 245, 164,  49, 142, 132, 204,  68,
          220,  25,  82,  63, 104,   0,   0,  49, 230, 100,  29,  63,  18,   0,   0,   0,
          192, 206,  78, 130, 153, 142,  32, 185, 172, 202, 230,  68,  60,  53,  51, 198,
          226,  55,  84,  41, 207,  52,  30, 145,   4, 113,   0, 190, 198, 183,   0,  61,
          24,   4, 175,  16, 119, 183,  28, 174,  13, 128, 228, 141,  95, 167,  55,  52,
          36, 211,  31, 160,  20,  85,  93,  98, 245, 236,  71, 155,   3, 128, 231,   8,
        ]),
      }),
      new Blake2bOperation(),
    ];
    const network = "NetXdQprcVkpaWU";
    const timestamp = new Date("2021-05-29T13:31:30.000Z");
    const rpcURL = "https://mainnet-tezos.giganode.io";
    const proof = new AffixedProof({ hash, operations, network, timestamp });
    assertEquals(
      await proof.verify(rpcURL),
      VerifyStatus.Verified,
    );
    assertEquals(
      await new AffixedProof({
        hash,
        operations: [
          ...operations,
          new Blake2bOperation(),
        ],
        network,
        timestamp,
      }).verify(rpcURL),
      VerifyStatus.NotFound,
    );
    assertEquals(
      await new AffixedProof({
        hash,
        operations,
        network,
        timestamp: new Date("1970-01-01T00:00:00.000Z"),
      }).verify(rpcURL),
      VerifyStatus.Mismatch,
    );
    await assertThrowsAsync(
      async () => await proof.verify("https://invalid"),
      TypeError,
    );
  },
});

Deno.test({
  name: "Pending proof construction",
  fn() {
    const hash = crypto.getRandomValues(new Uint8Array(32));
    const remote = "https://example.com/";
    const proof = new PendingProof({
      hash,
      operations: [],
      remote,
    });
    const template: PendingProofTemplate = {
      version: 1,
      hash: Hex.stringify(hash),
      operations: [],
      remote,
    };
    assertEquals(proof.remote.toString(), remote);
    assertEquals(proof.toJSON(), template);
    assertEquals(proof, Proof.from(template));
  },
});

Deno.test({
  name: "Proof concatenation",
  fn() {
    const hashA = crypto.getRandomValues(new Uint8Array(32));
    const hashB = new Blake2b().update(hashA).digest();
    const proofA = new Proof({
      hash: hashA,
      operations: [new Blake2bOperation()],
    });
    const proofB = new Proof({
      hash: hashB,
      operations: [new Blake2bOperation()],
    });
    const proofAB = proofA.concat(proofB);
    assertEquals(proofAB.hash, proofA.hash);
    assertEquals(
      proofAB.operations,
      proofA.operations.concat(proofB.operations),
    );
    assertEquals(
      proofAB.derivation,
      new Blake2b().update(hashB).digest(),
    );
    assertThrows(
      () =>
        proofA.concat(
          new Proof({
            hash: hashA,
            operations: [],
          }),
        ),
      MismatchedHashError,
    );
    assert(
      proofA.concat(
        new AffixedProof({
          hash: hashB,
          operations: [],
          network: "NetXdQprcVkpaWU",
          timestamp: new Date(),
        }),
      ) instanceof AffixedProof,
    );
    assert(
      proofA.concat(
        new PendingProof({
          hash: hashB,
          operations: [],
          remote: "https://localhost",
        }),
      ) instanceof PendingProof,
    );
  },
});
