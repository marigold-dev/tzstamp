# TzStamp Tezos-style Merkle Trees

Fast-appendable Tezos-style Merkle trees for
[TzStamp tools](https://tzstamp.io).

Tezos-style Merkle trees use the [BLAKE2b](https://www.blake2.net/) hashing
algorithm and implicitly repeat the last leaf until the tree is perfect.

This implementation has logarithmic time-complexity appends to allow for
progressive root derivation over a long runtime. You can find the
[official Tezos implementation here](https://gitlab.com/tezos/tezos/-/blob/master/src/lib_crypto/blake2B.ml).

## Usage

```js
// Node + NPM
const { MerkleTree } = require("@tzstamp/tezos-merkle");

// Deno
import { MerkleTree } from "https://raw.githubusercontent.com/marigold-dev/tzstamp/0.3.4/tezos-merkle/mod.ts";
```

See the
[full reference documentation here](https://doc.deno.land/https/raw.githubusercontent.com/marigold-dev/tzstamp/0.3.4/tezos-merkle/mod.ts).

### Building a Merkle tree

```js
const merkleTree = new MerkleTree();

// Append data blocks
merkleTree.append(
  new Uint8Array([1, 4, 7]),
  new Uint8Array([55, 66, 77]),
  new Uint8Array([0, 0, 0, 255]),
);

// Get leaf count
merkleTree.size; // 3

// Get the current root
merkleTree.root; // Uint8Array(32)

// Check if a block is included in the tree
merkleTree.has(new Uint8Array([1, 4, 7])); // true
merkleTree.has(new Uint8Array([255])); // false
```

Block deduplication (off by default) can be configured like so:

```js
const merkleTree = new MerkleTree({
  deduplicate: true,
});

merkleTree.append(
  new Uint8Array([1, 2, 3, 4]),
  new Uint8Array([1, 2, 3, 4]), // deduplicated
);

merkleTree.size; // 1
```

### Generating paths

Block-to-root paths can be computed like so:

```js
const paths = merkleTree.path(4); // Path from 5th block to the root

path.block; // Uint8Array
path.root; // Uint8Array(32)

// Sibling nodes along path to root
path.siblings;
// [ { hash: Uint8Array {}, relation: "left" }, ... ]
```

A [timestamp proof segment](https://github.com/marigold-dev/tzstamp/tree/main/proof) can be constructed
with the `.toProof` method:

```js
path.toProof(); // Proof{}
```

A `paths` generator function is provided to compute paths for all blocks in the
tree, facilitating mass proof construction.

```js
for (const path of merkleTree.paths()) {
  const proof = path.toProof();
  await storeMyProof(proof);
}
```

## License

[MIT](license.txt)
