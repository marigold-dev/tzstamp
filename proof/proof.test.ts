import {
  AffixedProof,
  AffixedProofOptions,
  AffixedProofTemplate,
  Proof,
  ProofOptions,
  ProofTemplate,
  UnresolvedProof,
  UnresolvedProofOptions,
  UnresolvedProofTemplate,
  VerifyStatus,
} from "./proof.ts";
import {
  FetchError,
  InvalidTezosNetworkError,
  MismatchedHashError,
  UnsupportedVersionError,
} from "./errors.ts";
import { Blake2bOperation, JoinOperation } from "./operation.ts";
import { Blake2b, concat, Hex } from "./deps.ts";
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
const serverURL = `http://${serverAddr.hostname}:${serverAddr.port}/`;
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
            AffixedProof.create({
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
    const options: ProofOptions = {
      hash: crypto.getRandomValues(new Uint8Array(32)),
      operations: [
        new JoinOperation({
          append: new Uint8Array([1]),
        }),
      ],
    };
    const proof = new Proof(options);
    const template: ProofTemplate = {
      version: 1,
      hash: Hex.stringify(options.hash),
      operations: options.operations.map((op) => op.toJSON()),
    };
    assertEquals(proof.hash, options.hash);
    assertEquals(proof.operations, options.operations);
    assertEquals(
      proof.derivation,
      concat(options.hash, 1),
    );
    assert(!proof.isAffixed());
    assert(!proof.isUnresolved());
    assertEquals(proof.toJSON(), template);
    assertEquals(proof, Proof.from(template));
    assertEquals(proof, Proof.create(options));
  },
});

Deno.test({
  name: "Invalid proof templating",
  fn() {
    assertThrows(
      () => Proof.from(null),
      SyntaxError,
    );
    assertThrows(
      () => Proof.from({}),
      SyntaxError,
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
    const operations = [new Blake2bOperation()];
    const proofA = new Proof({ hash: hashA, operations });
    const proofB = new Proof({ hash: hashB, operations });
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
    assert(!proofAB.isAffixed());
    assert(!proofAB.isUnresolved());
    const affixedProof = new AffixedProof({
      hash: hashB,
      operations: [],
      network: NULLNET,
      timestamp: new Date(),
    });
    assertThrows(() => affixedProof.concat(proofA), TypeError);
    assert(proofA.concat(affixedProof).isAffixed());
    assertThrows(
      () => proofA.concat(proofAB),
      MismatchedHashError,
    );
    const unresolvedProof = new UnresolvedProof({
      hash: hashB,
      operations: [],
      remote: serverURL,
    });
    assert(proofA.concat(unresolvedProof).isUnresolved());
  },
});

Deno.test({
  name: "Affixed proof construction and templating",
  fn() {
    const options: AffixedProofOptions = {
      hash: crypto.getRandomValues(new Uint8Array(32)),
      operations: [
        new JoinOperation({
          prepend: new Uint8Array([2]),
        }),
      ],
      network: MAINNET,
      timestamp: DATE_0,
    };
    const proof = new AffixedProof(options);
    const template: AffixedProofTemplate = {
      version: 1,
      hash: Hex.stringify(options.hash),
      operations: options.operations.map((op) => op.toJSON()),
      network: options.network,
      timestamp: options.timestamp.toISOString(),
    };
    assertEquals(proof.network, options.network);
    assertEquals(proof.timestamp, options.timestamp);
    assert(proof.mainnet);
    assert(proof.isAffixed());
    assert(proof instanceof AffixedProof);
    assert(!proof.isUnresolved());
    assert(!new AffixedProof({ ...options, network: NULLNET }).mainnet);
    assertEquals(proof.toJSON(), template);
    assertEquals(proof, Proof.from(template));
    assertEquals(proof, Proof.create(options));
    assertThrows(
      () => new AffixedProof({ ...options, network: "invalid" }),
      InvalidTezosNetworkError,
    );
  },
});

Deno.test({
  name: "Affixed proof verification",
  permissions: {
    net: true,
  },
  async fn() {
    const options: AffixedProofOptions = {
      hash: crypto.getRandomValues(new Uint8Array(32)),
      operations: [new Blake2bOperation()],
      network: MAINNET,
      timestamp: DATE_0,
    };
    const proof = new AffixedProof(options);
    const nullProof = new AffixedProof({ ...options, network: NULLNET });
    const mismatchProof = new AffixedProof({
      ...options,
      timestamp: new Date(),
    });
    const results = await Promise.all([
      proof.verify(serverURL),
      nullProof.verify(serverURL),
      mismatchProof.verify(serverURL),
    ]);
    assertEquals(results[0].status, VerifyStatus.Verified);
    assertEquals(results[1].status, VerifyStatus.NotFound);
    assertEquals(results[2].status, VerifyStatus.Mismatch);
    await Promise.all([
      assertThrowsAsync(
        () => proof.verify("invalid"),
        TypeError,
      ),
      assertThrowsAsync(
        () => proof.verify("http://unresolvable"),
        TypeError,
      ),
      assertThrowsAsync(
        () => proof.verify(serverURL + "unauthorized/"),
        FetchError,
      ),
    ]);
  },
});

Deno.test({
  name: "Unresolved proof construction and templating",
  fn() {
    const options: UnresolvedProofOptions = {
      hash: crypto.getRandomValues(new Uint8Array(32)),
      operations: [],
      remote: serverURL + "proof/myProof",
    };
    const proof = new UnresolvedProof(options);
    const template: UnresolvedProofTemplate = {
      version: 1,
      hash: Hex.stringify(options.hash),
      operations: options.operations.map((op) => op.toJSON()),
      remote: options.remote,
    };
    assertEquals(proof.remote, options.remote);
    assertEquals(proof.toJSON(), template);
    assertEquals(proof, Proof.from(template));
    assert(proof.isUnresolved());
    assert(proof instanceof UnresolvedProof);
    assert(!proof.isAffixed());
  },
});

Deno.test({
  name: "Pending proof resolution",
  permissions: {
    net: true,
  },
  async fn() {
    const options: UnresolvedProofOptions = {
      hash: new Uint8Array(),
      operations: [new Blake2bOperation()],
      remote: serverURL + "proof/myProof",
    };
    const proof = new UnresolvedProof(options);
    const unauthProof = new UnresolvedProof({
      ...options,
      remote: serverURL + "unauthorized/proof/myProof",
    });
    const resolvedProof = await proof.resolve();
    assert(resolvedProof instanceof Proof);
    assertEquals(resolvedProof.hash, proof.hash);
    assertEquals(resolvedProof.derivation, proof.derivation);
    await assertThrowsAsync(
      () => unauthProof.resolve(),
      FetchError,
    );
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
