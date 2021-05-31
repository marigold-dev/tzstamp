import { blake2b, concat, Hex } from "./deps.deno.ts";

/**
 * Step along path
 */
export interface Step {
  /**
   * Sibling node hash
   */
  sibling: Uint8Array;

  /**
   * Relation of a sibling node
   *
   * The hash of a left sibling node should prepended to the current
   * hash to derive the parent node hash, whereas the hash of a right
   * sibling node should appended.
   */
  relation: "left" | "right";
}

/**
 * Path from leaf to root
 */
export interface Path {
  /**
   * Leaf node hash
   */
  leaf: Uint8Array;

  /**
   * Path steps from leaf to root hash, exluding both
   */
  steps: Step[];

  /**
   * Root node hash
   */
  root: Uint8Array;
}

/**
 * Appendable Tezos-style Merkle tree
 *
 * Based on the Merkle tree implementation found within the
 * [Tezos source code][merkle].
 * While the leaf count is not a power of 2, the last leaf in
 * the tree is implicitly duplicated until the tree is perfect.
 * Appends have a logarithmic time complexity.
 *
 * [merkle]: https://gitlab.com/tezos/tezos/-/blob/master/src/lib_crypto/blake2B.ml
 */
export class MerkleTree {
  private leafSet: Set<string> = new Set();
  private layers: Uint8Array[][] = [[]];

  /**
   * Root hash
   */
  get root(): Uint8Array {
    return this.layers[this.layers.length - 1][0];
  }

  /**
   * The number of leaves included within the Merkle tree
   */
  get size(): number {
    return this.leafSet.size;
  }

  /**
   * Appends data blocks to the Merkle tree
   *
   * Appends have logarithmic time complexity. The last leaf
   * appended is implicitly duplicated until the tree is perfect.
   *
   * ```ts
   * merkleTree.size; // 3
   *
   * merkleTree.append(
   *   new Uint8Array([ 1, 2 ]),
   *   new Uint8Array([ 3, 4 ]),
   *   new Uint8Array([ 5, 6 ]),
   * );
   *
   * merkleTree.size; // 6
   * ```
   *
   * Merkle trees configured to deduplicate leaves will silently
   * drop previously-included leaves:
   *
   * ```ts
   * merkleTree.size; // 3
   *
   * merkleTree.append(
   *   new Uint8Array([ 1, 2 ]),
   *   new Uint8Array([ 1, 2 ]),
   *   new Uint8Array([ 1, 2 ]),
   * );
   *
   * merkleTree.size; // 4
   * ```
   */
  append(...blocks: Uint8Array[]): void {
    for (const block of blocks) {
      // Create leaf
      const leaf = blake2b(block);
      const leafHex = Hex.stringify(leaf);

      // Deduplicate leaves already in tree
      if (this.leafSet.has(leafHex)) {
        continue;
      }
      this.leafSet.add(leafHex);

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
        const parent = blake2b(concatenation);

        // Advance cursor
        index = Math.floor(index / 2);
        ++height;

        // Create new layer if needed
        if (this.layers[height] == null) {
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
          tail = blake2b(concat(tail, tail));
        }
      }
    }
  }

  /**
   * Check if a block is included in the tree
   * @param block Data block corresponding to a leaf
   */
  has(block: Uint8Array): boolean {
    const leaf = blake2b(block);
    const leafHex = Hex.stringify(leaf);
    return this.leafSet.has(leafHex);
  }

  /**
   * Calculates the path from a leaf at the given index to the root hash.
   * Throws if the index is out of range.
   *
   * @param index Index of the leaf.
   */
  path(index: number): Path {
    if (!(index in this.layers[0])) {
      throw new RangeError("Leaf index is out of range");
    }

    const steps: Step[] = [];
    let height = 0;
    let cursor = index;
    let tail = this.layers[0][this.layers[0].length - 1];

    // Step through each layer, except the highest
    while (height < this.layers.length - 1) {
      // Add path step
      const relation = cursor % 2 ? "left" : "right";
      const sibling = relation == "left"
        ? this.layers[height][cursor - 1]
        : this.layers[height][cursor + 1] ?? tail;
      steps.push({ relation, sibling });

      ++height;
      cursor = Math.floor(cursor / 2);
      tail = blake2b(concat(tail, tail));
    }

    return {
      leaf: this.layers[0][index],
      steps,
      root: this.root,
    };
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
