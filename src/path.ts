/**
 * Relation to a sibling node
 */
export enum Relation {
  RIGHT = 0,
  LEFT = 1
}

/**
 * Leaf-to-root path
 */
export interface Path {

  /**
   * Leaf hash
   */
  leaf: Uint8Array,

  /**
   * Path steps. Each step contains the relation to each sibling node and its hash
   */
  steps: [Relation, Uint8Array][]

  /**
   * Root hash
   */
  root: Uint8Array
}
