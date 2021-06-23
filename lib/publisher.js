const { Hex } = require('@tzstamp/helpers')
const { buildHighProof } = require('./proofs')

/**
 * Publication handler
 */
class Publisher {

  /**
   * @param {import('./storage').ProofStorage} storage
   * @param {import('./aggregator').Aggregator} aggregator
   * @param {import('@taquito/taquito').TezosToolkit} tezosClient
   */
  constructor (storage, aggregator, tezosClient) {
    this.storage = storage
    this.aggregator = aggregator
    this.tezosClient = tezosClient
    this.contract = null
  }

  /**
   * Binds the publisher to a smart contract.
   *
   * @param {string} contractAddress
   */
  async bind (contractAddress) {
    this.contract = await this.tezosClient.contract.at(contractAddress)
  }

  /**
   * Publishes the aggregator root.
   */
  async publish () {
    if (this.aggregator.merkleTree.size == 0) {
      console.log('Aggregator is empty. Skipping publication')
      return
    }
    const merkleTree = this.aggregator.cycle()
    const payload = Hex.stringify(merkleTree.root)
    console.log(`Publishing aggregator root "${payload}" (${merkleTree.size} leaves)`)
    const [ block, opGroup ] = await this.invoke(payload)
    console.log(`Saving proofs for root "${payload}" (${merkleTree.size} leaves)`)
    const highProof = buildHighProof(block, opGroup.hash, merkleTree.root)
    await this.output(merkleTree, highProof)
    console.log(`Operation for root "${payload}" injected: https://tzkt.io/${operationGroup.hash}`)
  }

  /**
   * Invokes the bound smart contract with the payload.
   *
   * @param {string} payload
   */
  async invoke (payload) {
    const opGroup = await this.contract.methods.default(payload).send()
    const level = await opGroup.confirmation(3)
    const block = await this.tezosClient.rpc.getBlock({ block: level - 2 }) // 2 blocks before 3rd confirmation
    return [ block, opGroup ]
  }

  /**
   * Outputs proofs to storage.
   *
   * @param {MerkleTree} merkleTree
   * @param {import('@tzstamp/proof').AffixedProof} highProof
   */
  async output (merkleTree, highProof) {
    for (const path of merkleTree.paths()) {
      const proof = path.toProof().concat(highProof)
      const proofId = Hex.stringify(path.leaf)
      this.storage.storeProof(proof, proofId)
      this.aggregator.pendingProofs.delete(proofId)
    }
  }
}

module.exports = {
  Publisher
}
