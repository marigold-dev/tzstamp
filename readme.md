# TzStamp Proofs

Cryptographic proofs-of-inclusion for use with [TzStamp tools][tzstamp].

TzStamp's proof protocol works by:

1. Constructing a local Merkle Tree of user submitted hashes
2. Publishing the root of that tree in a Tezos blockchain transaction
3. Constructing a chain of commitments starting from the local Merkle leaves up
   to the hash of the Tezos block containing the transaction.

The use of a local Merkle tree allows users to verify their proofs without
storing many unrelated hashes or relying on a central server. Tezos uses its own
Merkle Tree structure internally for operations and blocks. TzStamp 'bridges'
its local Merkle Tree with the on-chain tree by deriving a chain of commitments
between them. The chain of commitments approach lets TzStamp proofs avoid
relying on indexers. This is useful both for internal development reasons (at
time of writing Tezos indexers don't share a standard API) and for reducing the
attack surface of the overall TzStamp system. Leveraging the Tezos Merkle Trees
in this way also lets the smart contract used for publishing hashes avoid
storing any data at all. Instead a noop function accepting the hash as an
argument can be called. The resulting operation will stay in node archives long
enough for TzStamp to bridge its local tree root with the on-chain Merkle Tree.
At that point the proof is no longer reliant on Tezos nodes keeping a copy of
the operation at all, so it doesn't concern a TzStamp instance if the nodes
garbage collect it.

<img src="https://tzstamp.io/tzstamp-chain-of-commitments.png" width="500px" />

## Usage

```js
// Node + NPM
const { ... } = require("@tzstamp/proof");

// Deno
import { ... } from "https://gitlab.com/tzstamp/proof/raw/0.2.0/src/mod.ts";
```

See the [full reference documentation here][docs].

### Construct a proof

```ts
const { Proof, Blake2bOperation } = require("@tzstamp/proof");

const proof = new Proof({
  hash: myInputHash,
  operations: [
    new Sha256Operation(), // SHA-256 hash operation
    new Blake2bOperation(), // BLAKE2b 32-byte digest hash operation
    new Blake2bOperation(64), // BLAKE2b 64-byte digest hash operation
    new Blake2bOperation(undefined, myKey), // BLAKE2b 32-byte hash operation with key
    new JoinOperation({
      prepend: myPrependData,
      append: myAppendData,
    }), // Join operation. Can include prepend and/or append data
  ],
});
```

There is a subclass for proofs affixed to the Tezos blockchain that can be programmatically verified:

```ts
// Proof affixed to the Tezos blockchain.
// The derivation of this proof is supposed to be a raw Tezos block hash.
const affixedProof = new AffixedProof({
  hash: myInputHash,
  operations: [...],
  network: "NetXdQprcVkpaWU", // Tezos network identifier
  timestamp: new Date("1970-01-01T00:00:00.000Z") // Timestamp asserted by proof
});

affixedProof.blockHash;
// Base-58 encoded block hash

const status = await affixedProof.verify(rpcURL);
// Verifies the asserted timestamp against a tezos node
```

And a subclass for local proof segments waiting for a pending remote proof:

```ts
const pendingProof = new PendingProof({
  hash: myInputHash,
  operations: [...],
  remote: "https://tzstamp.example.com/proof/...",
})

const fullProof = await pendingProof.resolve();
// Fetches the remote proof and concatenates
```

### Serializing and Deserializing

Note: The `tzstamp-proof` v0.2.0 release supports *version 1* proof templates. Use the `tzstamp-proof` v0.1.0 release for *version 0* proof templates, and the Demo releases for pre-version proof templates.

```js
// Deserialize from JSON
const json = fs.readFileSync("my-proof.json", "utf-8");
const proof = Proof.from(json);

// Serialize to JSON
const json = JSON.stringify(proof);
fs.writeFileSync("my-proof.json", json);
```

## License

[MIT](LICENSE.txt)

[tzstamp]: https://tzstamp.io
[docs]: https://doc.deno.land/https/gitlab.com/tzstamp/proof/raw/0.2.0/src/mod.ts
