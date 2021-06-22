const { Hex } = require('@tzstamp/helpers')
const {
  operationGroupProof,
  operationsHashProof,
  blockHeaderProof
} = require('./proofs')

/**
 * Creates a publication callback to be run on an interval.
 *
 * @param {import('./storage').ProofStorage} storage
 * @param {import('./aggregator').Aggregator} aggregator
 * @param {import('@taquito/taquito').TezosToolkit} tezosClient
 * @param {string} contractAddress
 */
exports.configurePublisher = async function (
  storage,
  aggregator,
  tezosClient,
  contractAddress
) {
  const contract = await tezosClient.contract.at(contractAddress)
  return async () => {

    // Skip if aggregator is empty
    if (aggregator.merkleTree.size == 0) {
      console.log('Aggregator is empty. Skipping publication')
      return
    }

    // Invoke contract and await confirmation
    const merkleTree = aggregator.cycle()
    const payload = Hex.stringify(merkleTree.root)
    console.log(`Publishing aggregator root "${payload}" (${merkleTree.size} leaves)`)
    const operationGroup = await contract.methods.default(payload).send()
    const level = await operationGroup.confirmation(3)

    // Build and validate proof operations from aggregator root to block hash
    const block = await tezosClient.rpc.getBlock({ block: level - 2 }) // 2 blocks before 3rd confirmation
    const opGroupData = block.operations[3].find(op => op.hash == operationGroup.hash)
    if (!opGroupData) {
      throw new Error('Target operation group not found in fourth pass')
    }
    const opGroupProof = operationGroupProof(merkleTree.root, opGroupData)
    const opsHashProof = operationsHashProof(operationGroup.hash, block.operations)
    const headerProof = blockHeaderProof(block.chain_id, block.header)
    const highProof = opGroupProof
      .concat(opsHashProof)
      .concat(headerProof)

    // Generate proofs
    console.log(`Saving proofs for root "${payload}" (${merkleTree.size} leaves)`)
    for (const path of merkleTree.paths()) {
      const proof = path.toProof().concat(highProof)
      const proofId = Hex.stringify(path.leaf)
      storage.storeProof(proof, proofId)
      aggregator.pendingProofs.delete(proofId)
    }

    console.log(`Operation for root "${payload}" injected: https://tzkt.io/${operationGroup.hash}`)
  }
}
