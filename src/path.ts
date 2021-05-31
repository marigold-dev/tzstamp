import {
  Blake2bOperation,
  JoinOperation,
  Operation,
  Proof,
} from "./deps.deno.ts";

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
 * Path constructor options
 */
export interface PathOptions {
  /**
   * Leaf node hash
   */
  leaf: Uint8Array;

  /**
   * Path steps from leaf to root hash, excluding both.
   */
  steps: Step[];

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
   * Leaf node hash
   */
  leaf: Uint8Array;

  /**
   * Path steps from leaf to root hash, excluding both
   */
  steps: Step[];

  /**
   * Root node hash
   */
  root: Uint8Array;

  constructor({ leaf, steps, root }: PathOptions) {
    this.leaf = leaf;
    this.steps = steps;
    this.root = root;
  }

  /**
   * Creates a proof from the path.
   */
  toProof(): Proof {
    const operations: Operation[] = [];
    for (const { sibling, relation } of this.steps) {
      operations.push(
        new JoinOperation({
          prepend: relation == "left" ? sibling : undefined,
          append: relation == "right" ? sibling : undefined,
        }),
        new Blake2bOperation(),
      );
    }
    return new Proof({
      hash: this.leaf,
      operations,
    });
  }
}
