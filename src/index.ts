import { blake2b, compare, concat } from '@tzstamp/helpers'

/**
 * Relation to a sibling node
 */
export enum Relation { LEFT, RIGHT }

/**
 * Appendable Tezos Merkle tree
 */
export class MerkleTree {

  /**
   * Ordered list of data blocks in the tree
   */
  blocks: Uint8Array[] = []

  /**
   * Layers of nodes
   */
  #layers: Uint8Array[][] = [[]]

  /**
   * Node layers
   */
  get layers (): Uint8Array[][] {
    return this.#layers
  }

  /**
   * Root hash
   */
  get root (): Uint8Array {
    return this.#layers[this.#layers.length - 1][0]
  }

  /**
   * Append data blocks to the tree
   */
  append (...blocks: Uint8Array[]): void {
    for (const block of blocks) {

      // Deduplicate blocks already in tree
      if (this.blocks.find(existingBlock => compare(existingBlock, block)))
        continue

      // Remember block
      this.blocks.push(block)

      // Create cursor variables
      let index = this.blocks.length - 1
      let height = 0

      // Create a "tail" variable, representing the repeated
      // leaf nodes extrapolated to the current layer height
      let tail = blake2b(block)

      // Create leaf corresponding to block
      this.#layers[height][index] = tail

      // While the current layer doesn't contain the root
      while (this.#layers[height].length > 1) {

        // Calculate parent node
        const parent = blake2b(
          index % 2 == 0

            // There is no sibling element (yet).
            // Hash-concat the current node to the tail
            ? concat(
              this.#layers[height][index],
              tail
            )

            // There is a previous sibling element
            : concat(
              this.#layers[height][index - 1],
              this.#layers[height][index]
            )
        )

        // Advance cursor
        index = Math.floor(index / 2)
        ++height

        // Create new layer if needed
        if (this.#layers[height] == null)
          this.#layers[height] = []

        // Store parent node
        this.#layers[height][index] = parent

        // Advance tail
        tail = blake2b(concat(tail, tail))
      }
    }
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
