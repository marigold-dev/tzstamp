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
          ? concat(this.#layers[height][index - 1], this.#layers[height][index]) // Concat with left sibling
          : concat(this.#layers[height][index], tail) // There is no  right sibling; concat with tail
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
   * Determine the path from the leaf at the given index to the root
   */
  *paths (index: number): Generator<[Relation, Uint8Array][]> {
    for (const index in this.#layers[0]) {

      // Get leaf
      const leaf = this.#layers[0][index]

      // Resulting path
      const result: [Relation, Uint8Array][] = []

      // Cursor and tail
      let h = 0 // Height
      let i = +index // Index
      let t = this.#layers[0][this.#layers[0].length - 1] // Tail

      // Step through each layer except the highest
      while (h < this.#layers.length - 1) {

        // Add path step
        const relation = i % 2
        const node = relation
          ? this.#layers[h][i - 1] // Left sibling
          : this.#layers[h][i + 1] ?? t // Right sibling, or tail if absent
        result.push([ relation, node ])

        // Advance cursor and tail
        ++h
        i = Math.floor(i / 2)
        t = blake2b(concat(t, t))
      }

      yield result
    }
  }
}
