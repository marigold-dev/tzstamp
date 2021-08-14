const { MerkleTree } = require('@tzstamp/tezos-merkle')
const { Hex } = require('@tzstamp/helpers')
const { buildHighProof } = require('./proofs')

/**
 * Aggregator context containing an active Merkle tree and publishing utilities
 */
class Aggregator {

  /**
   * @param {import('./storage').ProofStorage} storage
   * @param {import('@taquito/rpc').RpcClient} rpc
   * @param {import('@taquito/taquito').ContractAbstraction<import('@taquito/taquito').ContractProvider>} contract
   */
  constructor (storage, rpc, contract) {
    this.cycle()
    this.pendingProofs = new Set()
    this._storage = storage
    this._rpc = rpc
    this._contract = contract
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

  /**
   * Publishes the aggregator root.
   */
  async publish () {
    if (this.merkleTree.size == 0) {
      console.log('Aggregator is empty. Skipping publication')
      return
    }
    const merkleTree = this.cycle()
    const payload = Hex.stringify(merkleTree.root)
    console.log(`Publishing aggregator root "${payload}" (${merkleTree.size} leaves)`)
    const [ block, opGroup ] = await this._invoke(payload)
    console.log(`Saving proofs for root "${payload}" (${merkleTree.size} leaves)`)
    const highProof = await buildHighProof(block, opGroup.hash, merkleTree.root)
    await this._output(merkleTree, highProof)
    console.log(`Operation for root "${payload}" injected: https://tzkt.io/${opGroup.hash}`)
  }

  /**
   * Invokes the cached smart contract with the payload.
   *
   * @param {string} payload
   */
  async _invoke (payload) {
    const opGroup = await this._contract.methods.default(payload).send()
    const level = await opGroup.confirmation(3)
    const block = await this._rpc.getBlock({ block: level - 2 }) // 2 blocks before 3rd confirmation
    return [ block, opGroup ]
  }

  /**
   * Outputs proofs to storage.
   *
   * @param {MerkleTree} merkleTree
   * @param {import('./proof').AffixedProof} highProof
   */
  async _output (merkleTree, highProof) {
    for (const path of merkleTree.paths()) {
      const proof = path.toProof().concat(highProof)
      const proofId = Hex.stringify(path.leaf)
      await this._storage.storeProof(proof, proofId)
      this.pendingProofs.delete(proofId)
    }
  }
}

module.exports = {
  Aggregator
}
