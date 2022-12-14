import { Blake2b, concat, Hex } from "./deps.ts";
import { Path, Sibling } from "./path.ts";

/**
 * Tezos-style Merkle tree constructor options
 */
export interface MerkleTreeOptions {
  deduplicate?: boolean;
}

/**
 * Appendable Tezos-style Merkle tree
 *
 * Based on the Merkle tree implementation found within the
 * [Tezos source code](https://gitlab.com/tezos/tezos/-/blob/master/src/lib_crypto/blake2B.ml).
 *
 * The hashing algorithm is BLAKE2b with 32-byte digests. The last
 * leaf is implicitly duplicated until the tree is perfect. The root
 * of an empty tree is the BLAKE2b digest of no input.
 *
 * Appends have a logarithmic time complexity.
 */
export class MerkleTree {
  private blockSet = new Set<string>();
  private blocks: Uint8Array[] = [];
  private layers: Uint8Array[][] = [[]];
  private readonly deduplicate: boolean;

  /**
   * @param deduplicate Deduplicate leaves. Defaults to false
   */
  constructor({ deduplicate = false }: MerkleTreeOptions = {}) {
    this.deduplicate = deduplicate;
  }

  /**
   * Root hash
   */
  get root(): Uint8Array {
    return this.blocks.length
      ? this.layers[this.layers.length - 1][0]
      : Blake2b.digest(new Uint8Array());
  }

  /**
   * The number of leaves included within the Merkle tree
   */
  get size(): number {
    return this.blocks.length;
  }

  /**
   * Appends data blocks to the Merkle tree.
   *
   * ```js
   * const merkleTree = new MerkleTree();
   *
   * merkleTree.append(
   *   new Uint8Array([ 1, 2 ]),
   *   new Uint8Array([ 3, 4 ]),
   *   new Uint8Array([ 5, 6 ]),
   * );
   *
   * merkleTree.size; // 3
   * ```
   *
   * Merkle trees configured to deduplicate blocks will silently
   * drop previously-included blocks:
   *
   * ```js
   * const merkleTree = new MerkleTree({
   *   deduplicate: true,
   * });
   *
   * merkleTree.append(
   *   new Uint8Array([ 1, 2 ]),
   *   new Uint8Array([ 1, 2 ]), // deduplicated
   * );
   *
   * merkleTree.size; // 1
   * ```
   *
   * Appends have logarithmic time-complexity. Internally, the
   * last leaf is implicitly duplicated until the tree is perfect.
   *
   * @param blocks Data blocks
   */
  append(...blocks: Uint8Array[]): void {
    for (const block of blocks) {
      // Deduplicate leaves already in tree
      const blockHex = Hex.stringify(block);
      if (this.deduplicate && this.blockSet.has(blockHex)) {
        continue;
      }
      this.blocks.push(block);
      this.blockSet.add(blockHex);

      // Create leaf
      const leaf = Blake2b.digest(block);

      // Create cursor variables
      let index = this.layers[0].length;
      let height = 0;

      // Create a "tail" variable, representing the repeated
      // leaf nodes extrapolated to the current layer height
      let computeTail = true;
      let tail = leaf;

      // Create leaf
      this.layers[0].push(leaf);

      // While the current layer doesn't contain the root
      while (this.layers[height].length > 1) {
        // Calculate parent node
        const concatenation = (index % 2)
          ? concat(this.layers[height][index - 1], this.layers[height][index]) // Concat with left sibling
          : concat(this.layers[height][index], tail); // There is no  right sibling; concat with tail
        const parent = Blake2b.digest(concatenation);

        // Advance cursor
        index = Math.floor(index / 2);
        ++height;

        // Create new layer if needed
        if (this.layers[height] == undefined) {
          this.layers[height] = [];
        }

        // Store parent node
        this.layers[height][index] = parent;

        // Stop computing the tail once the remaining layers are balanced
        if (Math.log2(this.layers[height].length) % 1 == 0) {
          computeTail = false;
        }

        // Advance tail
        if (computeTail) {
          tail = Blake2b.digest(concat(tail, tail));
        }
      }
    }
  }

  /**
   * Checks if a block is included in the tree.
   *
   * @param block Data block
   */
  has(block: Uint8Array): boolean {
    const blockHex = Hex.stringify(block);
    return this.blockSet.has(blockHex);
  }

  /**
   * Calculates the path from a leaf at the given index to the root hash.
   * Throws `RangeError` if there is no leaf with the given index.
   *
   * @param index Index of the leaf.
   */
  path(index: number): Path {
    if (!(index in this.blocks)) {
      throw new RangeError("Leaf index is out of range");
    }

    const siblings: Sibling[] = [];
    let height = 0;
    let cursor = index;
    let tail = this.layers[0][this.layers[0].length - 1];

    // Step through each layer, except the highest
    while (height < this.layers.length - 1) {
      // Add path sibling
      const relation = cursor % 2 ? "left" : "right";
      const hash = relation == "left"
        ? this.layers[height][cursor - 1]
        : this.layers[height][cursor + 1] ?? tail;
      siblings.push({ hash, relation });

      ++height;
      cursor = Math.floor(cursor / 2);
      tail = Blake2b.digest(concat(tail, tail));
    }

    return new Path({
      block: this.blocks[index],
      siblings,
      root: this.root,
    });
  }

  /**
   * Generates all leaf-to-root paths in the Merkle tree.
   */
  *paths(): Generator<Path> {
    for (const index in this.layers[0]) {
      yield this.path(+index);
    }
  }
}
