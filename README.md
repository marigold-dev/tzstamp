# TzStamp Tezos Merkle Trees

Fast-appendable Tezos-style Merkle trees for
[TzStamp tools](https://tzstamp.io).

Tezos-style Merkle Trees use the Blake2b 256-bit hashing algorithm and
implicitly repeat the last leaf until the tree is
[perfect](https://xlinux.nist.gov/dads/HTML/perfectBinaryTree.html).

This implementation uses logrithmic time-complexity appends to allow for
progressive root derivation over a long runtime. You can find the
[official Tezos implementation here](https://gitlab.com/tezos/tezos/-/blob/master/src/lib_crypto/blake2B.ml).

## Usage

```js
// Deno
import { MerkleTree } from "https://gitlab.com/tzstamp/tezos-merkle/-/raw/0.2.0/src/mod.ts";

// Node+NPM
const { MerkleTree } = require("@tzstamp/tezos-merkle");
```

### Constructing a new Merkle tree

```js
const merkleTree = new MerkleTree();
```

### Appending data blocks

```js
merkleTree.append(
  new Uint8Array([1, 4, 7]),
  new Uint8Array([55, 66, 77]),
  new Uint8Array([0, 0, 0, 255]),
);

// Automatic deduplication
merkleTree.size; // 3
merkleTree.append(new Uint8Array([1, 4, 7]));
merkleTree.size; // 3

// Check for leaf inclusion
merkleTree.has(new Uint8Array([0, 0, 0, 255])); // true

// Get current root
merkleTree.root; // Uint8Array(32)
```

### Generating paths

A generator function is provided that iterates over all leaf-to-root paths in
the tree, allowing for simple mass proof construction.

```js
import { Operation, Proof } from "@tzstamp/proof";

// ...

const paths = merkleTree.paths();
const proofs = [];
for (const path in paths) {
  const operations = [Operation.blake2b()];
  for (const [relation, sibling] of path.steps) {
    switch (relation) {
      case 1: // Sibling is to the left
        operations.push(Operation.prepend(sibling));
      case 0: // Sibling is to the right
        operations.push(Operation.append(sibling));
    }
    operations.push(Operation.blake2b());
  }
  proof.push(new Proof(NETWORK_ID, operations));
}
```

Each object produced by the generator has the following properties:

- `root`: Root byte array (`Uint8Array`)
- `leaf`: Hashed-leaf byte array (`Uint8Array`)
- `steps`: Array of sibling nodes (`{ sibling: Uint8Array, relation: "left" | "right" }[]`)

## License

[MIT](LICENSE.txt)
