import { blake2b, compare, concat, Hex } from '@tzstamp/helpers'

/**
 * Relation to a sibling node
 */
export enum Relation {
  RIGHT = 0,
  LEFT = 1
}

/**
 * Appendable Tezos Merkle tree
 */
export class MerkleTree {

  /**
   * Set of included leaves
   */
  #leaves: Set<string> = new Set

  /**
   * Layers of nodes
   */
  #layers: Uint8Array[][] = [[]]

  /**
   * Root hash
   */
  get root (): Uint8Array {
    return this.#layers[this.#layers.length - 1][0]
  }

  /**
   * The size of the tree
   */
  get size (): number {
    return this.#leaves.size
  }

  /**
   * Append data blocks to the tree
   */
  append (...blocks: Uint8Array[]): void {
    for (const block of blocks) {

      // Create leaf
      const leaf = blake2b(block)
      const leafHex = Hex.stringify(leaf)

      // Deduplicate leaves already in tree
      if (this.#leaves.has(leafHex))
        continue
      this.#leaves.add(leafHex)

      // Create cursor variables
      let index = this.#layers[0].length
      let height = 0

      // Create a "tail" variable, representing the repeated
      // leaf nodes extrapolated to the current layer height
      let computeTail = true
      let tail = leaf

      // Create leaf
      this.#layers[0].push(leaf)

      // While the current layer doesn't contain the root
      while (this.#layers[height].length > 1) {

        // Calculate parent node
        const concatenation = (index % 2)
          ? concat(this.node(index - 1, height), this.node(index, height)) // Concat with left sibling
          : concat(this.node(index, height), tail) // There is no  right sibling; concat with tail
        const parent = blake2b(concatenation)

        // Advance cursor
        index = Math.floor(index / 2)
        ++height

        // Create new layer if needed
        if (this.#layers[height] == null)
          this.#layers[height] = []

        // Store parent node
        this.#layers[height][index] = parent

        // Stop computing the tail once the remaining layers are balanced
        if (Math.log2(this.#layers[height].length) % 1 == 0)
          computeTail = false

        // Advance tail
        if (computeTail)
          tail = blake2b(concat(tail, tail))
      }
    }
  }

  /**
   * Check if a block is included in the tree
   * @param block Data block corresponding to a leaf
   */
  has (block: Uint8Array): boolean {
    const leaf = blake2b(block)
    const leafHex = Hex.stringify(leaf)
    return this.#leaves.has(leafHex)
  }

  /**
   * Get a node from the layers of the tree
   * @param index Index of now within layer
   * @param height Height of layer
   */
  node (index: number, height: number): Uint8Array {
    return this.#layers[height]?.[index]
  }

  /**
   * Determine the path from a block to the root
   */
  walk (block: Uint8Array): [Relation, Uint8Array][] {

    // Create cursor variables
    let index = this.blocks.findIndex(existingBlock => compare(existingBlock, block))
    let height = 0

    // Block not in Merkle tree
    if (index == -1)
      throw new Error('Given block is not included in the Merkle tree')

    // Create a "tail" variable, representing the repeated
    // leaf nodes extrapolated to the current layer height
    let tail = this.#layers[0][this.#layers[0].length - 1]

    // Resulting path
    const result: [Relation, Uint8Array][] = []

    // Step through each layer
    while (height < this.#layers.length - 1) {
      result.push(
        index % 2 == 0

          // Sibling is to the right
          // If the element is at the end of a layer,
          // the sibling is the tail
          ? [
            Relation.RIGHT,
            this.#layers[height][index + 1] || tail
          ]

          // Sibling is to the left
          : [
            Relation.LEFT,
            this.#layers[height][index - 1]
          ]
      )

      // Advance cusor
      index = Math.floor(index / 2)
      ++height

      // Advance tail
      tail = blake2b(concat(tail, tail))
    }

    return result
  }
}
