# TzStamp Proofs

Cryptographic proofs-of-inclusion for use with
[TzStamp tools](https://tzstamp.io).

TzStamp's proof protocol works by:

1. Constructing a local Merkle Tree of user submitted hashes
2. Publishing the root of that tree in a Tezos blockchain transaction
3. Constructing a chain of commitments starting from the local Merkle leaves up
to the hash of the Tezos block containing the transaction.

The use of a local Merkle tree allows users to verify their proofs without storing
many unrelated hashes or relying on a central server. Tezos uses its own Merkle Tree
structure internally for operations and blocks. TzStamp 'bridges' its local Merkle Tree
with the on-chain tree by deriving a chain of commitments between them. The chain of commitments
approach lets TzStamp proofs avoid relying on indexers. This is useful both for
internal development reasons (at time of writing Tezos indexers don't share a
standard API) and for reducing the attack surface of the overall TzStamp system.
Leveraging the Tezos Merkle Trees in this way also lets the smart contract used
for publishing hashes avoid storing any data at all. Instead a noop function
accepting the hash as an argument can be called. The resulting operation will stay
in node archives long enough for TzStamp to bridge its local tree root with the
on-chain Merkle Tree. At that point the proof is no longer reliant on Tezos nodes
keeping a copy of the operation at all, so it doesn't concern a TzStamp instance
if the nodes garbage collect it.

<img src="https://tzstamp.io/tzstamp-chain-of-commitments.png" width="500px" />

## Usage

```js
import { Block, Operation, Proof } from "@tzstamp/proof";
```

### Construct new proof

The `Proof` constructor takes two arguments:

- The network identifier as a string. The identifier of the Tezos mainnet is
  `"NetXdQprcVkpaWU"`
- An array of `Operation`s. Operations must not be an empty array.

```js
const proof = new Proof("NetXdQprcVkpaWU", [
  Operation.sha256(),
  Operation.blake2b(),
  Operation.prepend(new Uint8Array([55, 66, 77])),
  Operation.append(new Uint8Array([55, 66, 77])),
]);
```

### Operations

| Accessor          | Description                    | Arguments  |
| ----------------- | ------------------------------ | ---------- |
| Operation.prepend | Prepend arbitrary bytes        | Uint8Array |
| Operation.append  | Append arbitrary bytes         | Uint8Array |
| Operation.sha256  | Produce SHA-256 digest         | -          |
| Operation.blake2b | Produce Blake2b 256-bit digest | -          |

### Serializating and Deserializing

```js
// Deserialize from JSON
const json = fs.readFileSync("my-proof.json", "utf-8");
const proof = Proof.parse(json);

// Serialize to JSON
const json = JSON.stringify(proof);
fs.writeFileSync("my-proof.json", json);
```

## Derive Tezos block from proof

```js
const { createHash } = require("crypto");

// ...

const file = fs.readFileSync("my-file.pdf");
const input = new Uint8Array(
  createHash("SHA-256")
    .update(file)
    .digest(),
);
const block = proof.derive(input);
```

This will pipe the input through each operation. If the input and proof are
correct, the resulting byte array will be a raw Tezos block hash. A `Block`
interface with convenience methods is returned in place of that raw byte array.

## Lookup timestamp

```js
const block = proof.derive(input);
const timestamp = block.lookup("https://mainnet-tezos.giganode.io");
// returns `Date`
```

## License

[MIT](LICENSE.txt)
