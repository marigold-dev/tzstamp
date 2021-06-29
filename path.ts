import {
  Blake2b,
  Blake2bOperation,
  JoinOperation,
  Operation,
  Proof,
} from "./deps.ts";

/**
 * Sibling node
 */
export interface Sibling {
  /**
   * Sibling node hash
   */
  hash: Uint8Array;

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
 * Path constructor options
 */
export interface PathOptions {
  /**
   * Data block
   */
  block: Uint8Array;

  /**
   * Sibling nodes along the path from the block to the root hash.
   */
  siblings: Sibling[];

  /**
   * Root node hash
   */
  root: Uint8Array;
}

/**
 * Path from leaf to root
 */
export class Path {
  /**
   * Data block
   */
  block: Uint8Array;

  /**
   * Sibling nodes along path from the block to the root hash.
   */
  siblings: Sibling[];

  /**
   * Root node hash
   */
  root: Uint8Array;

  constructor({ block, siblings, root }: PathOptions) {
    this.block = block;
    this.siblings = siblings;
    this.root = root;
  }

  /**
   * Leaf node hash
   */
  get leaf(): Uint8Array {
    return Blake2b.digest(this.block);
  }

  /**
   * Creates a [TzStamp proof] from the path.
   *
   * [TzStamp proof]: https://gitlab.com/tzstamp/proof
   */
  toProof(): Proof {
    const operations: Operation[] = [new Blake2bOperation()];
    for (const { hash, relation } of this.siblings) {
      operations.push(
        new JoinOperation({
          prepend: relation == "left" ? hash : undefined,
          append: relation == "right" ? hash : undefined,
        }),
        new Blake2bOperation(),
      );
    }
    return new Proof({
      hash: this.block,
      operations,
    });
  }
}
