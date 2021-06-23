const { Aggregator } = require('../lib/aggregator')

let aggregator

describe('Use an aggregator', () => {
  test('Instantiate', () => {
    aggregator = new Aggregator()
  })
  test('Cycle the active Merkle tree', () => {
    const m1 = aggregator.merkleTree
    const m2 = aggregator.cycle()
    expect(m1).toBe(m2)
    expect(m1).not.toBe(aggregator.merkleTree)
  })
})
