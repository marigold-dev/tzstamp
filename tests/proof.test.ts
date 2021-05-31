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
  FetchError,
  InvalidTemplateError,
  InvalidTezosNetworkError,
  MismatchedHashError,
  UnsupportedVersionError,
} from "../src/errors.ts";
import {
  Blake2bOperation,
  JoinOperation,
  Operation,
} from "../src/operation.ts";
import { Base58, Blake2b, concat, Hex } from "../src/deps.deno.ts";
import {
  assert,
  assertEquals,
  assertThrows,
  assertThrowsAsync,
} from "./dev_deps.ts";

const MAINNET = "NetXdQprcVkpaWU";
const NULLNET = "NetXH12Aer3be93";
const DATE_0 = new Date("1970-01-01T00:00:00.000Z");

// HTTP mock server
const server = Deno.listen({ port: 57511 });
const serverAddr = server.addr as Deno.NetAddr;
const serverURL = new URL(`http://${serverAddr.hostname}:${serverAddr.port}/`);
void async function () {
  for await (const conn of server) {
    void async function () {
      const httpConn = Deno.serveHttp(conn);
      for await (const requestEvent of httpConn) {
        const url = new URL(requestEvent.request.url);
        let response: Response;
        if (url.pathname.match(/unauthorized\/.*/)) {
          // Forbidden node access
          response = new Response("Unauthorized", {
            status: 401,
          });
        } else if (
          url.pathname.match(
            new RegExp(`/chains/${MAINNET}/blocks/\\w+/header$`),
          )
        ) {
          // Block header mock
          const headers = new Headers();
          headers.set("Content-Type", "application/json");
          const body = JSON.stringify({
            timestamp: DATE_0.toISOString().slice(0, 19) + "Z",
          });
          response = new Response(body, {
            status: 200,
            headers,
          });
        } else if (url.pathname.match(/proof\/\w+$/)) {
          // Remote proof mock
          const headers = new Headers();
          headers.set("Content-Type", "application/json");
          const body = JSON.stringify(
            new AffixedProof({
              hash: new Blake2b().update(new Uint8Array()).digest(),
              operations: [],
              network: MAINNET,
              timestamp: DATE_0,
            }),
          );
          response = new Response(body, {
            status: 200,
            headers,
          });
        } else {
          // 404 Not Found
          response = new Response("Not found", { status: 404 });
        }
        await requestEvent.respondWith(response);
        httpConn.close();
      }
    }();
  }
}();

Deno.test({
  name: "Proof construction and templating",
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
    const dummyAffixedProof = new AffixedProof({
      hash: hashB,
      operations: [],
      network: NULLNET,
      timestamp: new Date(),
    });
    assertThrows(() => dummyAffixedProof.concat(proofA), TypeError);
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
    assert(proofA.concat(dummyAffixedProof) instanceof AffixedProof);
    assert(
      proofA.concat(
        new PendingProof({
          hash: hashB,
          operations: [],
          remote: serverURL,
        }),
      ) instanceof PendingProof,
    );
  },
});

Deno.test({
  name: "Affixed proof construction and templating",
  fn() {
    const hash = crypto.getRandomValues(new Uint8Array(32));
    const network = MAINNET;
    const timestamp = DATE_0;
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
        network: NULLNET,
        timestamp,
      })).mainnet,
    );
    assertEquals(
      proof.blockHash,
      Base58.encodeCheck(concat(1, 52, proof.derivation)),
    );
    assertEquals(proof.toJSON(), template);
    assertEquals(proof, Proof.from(template));
    assertThrows(
      () =>
        new AffixedProof({
          hash,
          operations: [],
          network: "invalid",
          timestamp,
        }),
      InvalidTezosNetworkError,
    );
  },
});

Deno.test({
  name: "Affixed proof verification",
  permissions: {
    net: true,
  },
  sanitizeResources: false,
  async fn() {
    const hash = crypto.getRandomValues(new Uint8Array(32));
    await assertThrowsAsync(
      () =>
        new AffixedProof({
          hash,
          operations: [new Blake2bOperation()],
          network: MAINNET,
          timestamp: DATE_0,
        }).verify("invalid"),
      TypeError,
    );
    assertEquals(
      await new AffixedProof({
        hash,
        operations: [new Blake2bOperation()],
        network: MAINNET,
        timestamp: DATE_0,
      }).verify("http://unresolvable"),
      VerifyStatus.NetError,
    );
    assertEquals(
      await new AffixedProof({
        hash,
        operations: [new Blake2bOperation()],
        network: MAINNET,
        timestamp: DATE_0,
      }).verify(serverURL + "unauthorized/"),
      VerifyStatus.NetError,
    );
    assertEquals(
      await new AffixedProof({
        hash,
        operations: [new Blake2bOperation()],
        network: NULLNET,
        timestamp: DATE_0,
      }).verify(serverURL),
      VerifyStatus.NotFound,
    );
    assertEquals(
      await new AffixedProof({
        hash,
        operations: [new Blake2bOperation()],
        network: MAINNET,
        timestamp: new Date(),
      }).verify(serverURL),
      VerifyStatus.Mismatch,
    );
    assertEquals(
      await new AffixedProof({
        hash,
        operations: [new Blake2bOperation()],
        network: MAINNET,
        timestamp: DATE_0,
      }).verify(serverURL),
      VerifyStatus.Verified,
    );
  },
});

Deno.test({
  name: "Pending proof construction and templating",
  fn() {
    const hash = crypto.getRandomValues(new Uint8Array(32));
    const remote = serverURL + "proof/myProof";
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
  name: "Pending proof resolution",
  permissions: {
    net: true,
  },
  sanitizeResources: false,
  async fn() {
    const proof = new PendingProof({
      hash: new Uint8Array(),
      operations: [new Blake2bOperation()],
      remote: serverURL + "proof/myProof",
    });
    const resolvedProof = await proof.resolve();
    assert(resolvedProof instanceof AffixedProof);
    assertEquals(resolvedProof.hash, proof.hash);
    assertEquals(resolvedProof.derivation, proof.derivation);
    await assertThrowsAsync(() =>
      new PendingProof({
        hash: new Uint8Array(),
        operations: [],
        remote: serverURL + "unauthorized/proof/myProof",
      }).resolve(), FetchError);
  },
});

Deno.test({
  name: "-- Cleanup --",
  sanitizeOps: false,
  sanitizeResources: false,
  fn() {
    server.close();
  },
});
