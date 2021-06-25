const { MerkleTree } = require('@tzstamp/tezos-merkle')

/**
 * Aggregator context containing an active Merkle tree and utilities
 */
class Aggregator {
  constructor () {
    this.cycle()
    this.pendingProofs = new Set()
  }

  /**
   * Resets the active Merkle tree.
   *
   * @returns the recent active Merkle tree
   */
  cycle () {
    const currentTree = this.merkleTree
    this.merkleTree = new MerkleTree({ deduplicate: true })
    return currentTree
  }
}

module.exports = {
  Aggregator
}
