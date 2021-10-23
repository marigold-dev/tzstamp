const { Aggregator } = require('../lib/aggregator')
const { randomInt } = require('crypto')
const { Proof } = require('@tzstamp/proof')
const { Blake2b, Hex } = require('@tzstamp/helpers')

// Mock data
const storage = {
  storeProof: jest.fn()
}
const height = randomInt(1000)
const blockData = {}
const rpc = {
  getBlock: jest.fn(({ block }) => {
    expect(block).toBe(height)
    return blockData
  })
}
const opGroup = {
  confirmation: jest.fn().mockResolvedValue(height + 2)
}
const defaultMethod = {
  send: jest.fn().mockResolvedValue(opGroup)
}
const contract = {
  methods: {
    default: jest.fn().mockReturnValue(defaultMethod)
  }
}
let aggregator

describe('Use an aggregator', () => {
  test('Instantiate', () => {
    aggregator = new Aggregator(storage, rpc, contract)
  })
  test('Cycle the active Merkle tree', () => {
    const m1 = aggregator.merkleTree
    const m2 = aggregator.cycle()
    expect(m1).toBe(m2)
    expect(m1).not.toBe(aggregator.merkleTree)
  })
  test('Invoke the publishing contract', async () => {
    const [ b, og ] = await aggregator._invoke('foo')
    expect(contract.methods.default.mock.calls.length).toBe(1)
    expect(defaultMethod.send.mock.calls.length).toBe(1)
    expect(opGroup.confirmation.mock.calls.length).toBe(1)
    expect(b).toEqual(blockData)
    expect(og).toEqual(opGroup)
  })
  test('Output proofs to storage', async () => {
    const data = [
      new Uint8Array([ 1 ]),
      new Uint8Array([ 2 ]),
      new Uint8Array([ 3 ])
    ]
    for (const block of data) {
      const proofId = Hex.stringify(Blake2b.digest(block))
      aggregator.pendingProofs.add(proofId)
    }
    const merkleTree = aggregator.cycle()
    merkleTree.append(...data)
    expect(aggregator.pendingProofs.size).toBe(3)
    const highProof = new Proof({
      hash: merkleTree.root,
      operations: []
    })
    await aggregator._output(merkleTree, highProof)
    expect(aggregator.pendingProofs.size).toBe(0)
    expect(storage.storeProof.mock.calls.length).toBe(3)
  })
})
