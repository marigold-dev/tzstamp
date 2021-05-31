import {
  blake2b,
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
   * Data block
   */
  block: Uint8Array;

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
   * Data block
   */
  block: Uint8Array;

  /**
   * Path steps from leaf to root hash, excluding both
   */
  steps: Step[];

  /**
   * Root node hash
   */
  root: Uint8Array;

  constructor({ block, steps, root }: PathOptions) {
    this.block = block;
    this.steps = steps;
    this.root = root;
  }

  /**
   * Leaf node hash
   */
  get leaf(): Uint8Array {
    return blake2b(this.block);
  }

  /**
   * Creates a proof from the path.
   */
  toProof(): Proof {
    const operations: Operation[] = [new Blake2bOperation()];
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
      hash: this.block,
      operations,
    });
  }
}
