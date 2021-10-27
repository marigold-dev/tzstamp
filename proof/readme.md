# TzStamp Proofs

Cryptographic timestamp proofs for use with [TzStamp tools](https://tzstamp.io).

TzStamp's proof protocol works by:

1. Constructing a local Merkle tree of user submitted hashes.
2. Publishing the root of that tree in a Tezos blockchain transaction.
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
storing any data at all. Instead a no-op function accepting the hash as an
argument can be called. The resulting operation will stay in node archives long
enough for TzStamp to bridge its local tree root with the on-chain Merkle Tree.
At that point the proof is no longer reliant on Tezos nodes keeping a copy of
the operation at all, so it doesn't concern a TzStamp instance if the nodes
garbage collect it.

<img src="https://tzstamp.io/tzstamp-chain-of-commitments.png" width="500px" />

## Usage

```js
// Node + NPM
const {/*...*/} = require("@tzstamp/proof");

// Deno
import {/*...*/} from "https://raw.githubusercontent.com/marigold-dev/tzstamp/0.3.2/proof/mod.ts";
```

See the
[full reference documentation here](https://doc.deno.land/https/raw.githubusercontent.com/marigold-dev/tzstamp/0.3.2/proof/mod.ts).

### Constructing a proof

Build an array of operations for the proof:

```js
const {
  Sha256Operation,
  Blake2bOperation,
  JoinOperation,
} = require("@tzstamp/proof");

// Create operations
const operations = [
  // Hash operations
  new Sha256Operation(),
  new Blake2bOperation(32),
  new Blake2bOperation(64, myKey),

  // Join operations
  new JoinOperation({ prepend: uint8Array }),
  new JoinOperation({ append: uint8Array }),
];
```

Create a proof:

```js
const { Proof } = require("@tzstamp/proof");

// Proof segment
const proof = Proof.create({
  hash: myInputHash, // Uint8Array
  operations,
}); // Proof{}

// Proof affixed to the Tezos blockchain
// The derivation of this proof is taken to be a raw Tezos block hash.
const affixedProof = Proof.create({
  hash: myInputHash,
  operations,
  network: "NetXdQprcVkpaWU", // Tezos network identifier
  timestamp: new Date("1970-01-01T00:00:00.000Z"), // Timestamp asserted by proof
}); // AffixedProof{}

// Remote resolvable proof
// The proof is to be concatenated with the proof segment published at the remote address
const unresolvedProof = Proof.create({
  hash: myInputHash,
  operations: [...],
  remote: "https://tzstamp.example.com/proof/...",
}); // UnresolvedProof{}
```

### Verifying affixed proofs

Affixed proofs (`AffixedProof` subclass) may be verified against a Tezos RPC.

```js
if (proof.isAffixed()) {
  proof.blockHash; // Base58 encoded block hash
  proof.mainnet; // Indicates that the affixed network is the Tezos Mainnet

  const result = await proof.verify(rpcURL);
  // Ex:
  // VerifyResult { verified: false, status: "notFound", message: "Derived block could not be found"}
  // VerifyResult { verified: true, status: "verified", message: "Verified proof" }
}
```

### Concatenating proof segments

Long proofs may be constructed in segments and concatenated. Concatenation is
only possible if the derivation of the first proof (the output of each operation
applied to its input hash) matched the input hash of the second proof.

```js
const proofA = Proof.create({
  hash: inputHash,
  operations: [/*...*/],
});

const proofB = Proof.create({
  hash: midHash,
  operations: [/*...*/],
});

const proofAB = proofA.concat(proofB); // Throws if `proofA.derivation` is not equal to `proofB.hash`
```

### Resolving unresolved proofs

Unresolved proofs (`UnresolvedProof` subclass) may be resolved by fetching the
next proof segment from a remote server and concatenating.

```js
if (proof.isUnresolved()) {
  const fullProof = await proof.resolve();
}
```

### Serializing and Deserializing

Note: The `tzstamp-proof` v0.3.0 release supports _version 1_ proof templates.
Use the `tzstamp-proof` v0.1.0 release for _version 0_ proof templates, and the
Demo releases for pre-version proof templates.

```js
// Deserialize from JSON
const json = fs.readFileSync("my-proof.json", "utf-8");
const proof = Proof.from(json);

// Serialize to JSON
const json = JSON.stringify(proof);
fs.writeFileSync("my-proof.json", json);
```

## License

[MIT](license.txt)
