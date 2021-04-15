const { MerkleTree, Relation } = require('../dist/merkletree')
const { concat, compare, blake2b } = require('@tzstamp/helpers')

const blocks = [
  new Uint8Array([ 1, 3, 4 ]),
  new Uint8Array([ 76, 199 ]),
  new Uint8Array([ 100, 200 ]),
  new Uint8Array([ 1, 2, 3 ]),
  new Uint8Array([ 145, 232 ]),
  new Uint8Array([ 67, 0, 0, 0 ]),
  new Uint8Array([ 9 ])
]

function hashcat (a, b) {
  return blake2b(concat(a, b))
}

test('Merkle tree appending', () => {
  const merkleTree = new MerkleTree

  // Single append
  merkleTree.append(blocks[0])
  expect(merkleTree.size)
    .toBe(1)

  // Multi append
  merkleTree.append(blocks[1], blocks[2])
  expect(merkleTree.size)
    .toBe(3)

  // Deduplication
  merkleTree.append(blocks[0])
  expect(merkleTree.size)
    .toBe(3)
})

test('Merkle tree root derivation', () => {
  const merkleTree = new MerkleTree
  merkleTree.append(...blocks)

  // Calculate manual root
  const manualRoot = hashcat(
    hashcat(
      hashcat(
        blake2b(blocks[0]),
        blake2b(blocks[1])
      ),
      hashcat(
        blake2b(blocks[2]),
        blake2b(blocks[3])
      )
    ),
    hashcat(
      hashcat(
        blake2b(blocks[4]),
        blake2b(blocks[5])
      ),
      hashcat(
        blake2b(blocks[6]),
        blake2b(blocks[6])
      )
    )
  )

  // Compare progressively calculated root
  expect(merkleTree.root)
    .toEqual(manualRoot)

  const sequence = []
  for (let i = 0; i < 65; ++i) {
    sequence.push(new Uint8Array([ i ]))
  }

  const bigMerkleTree = new MerkleTree
  bigMerkleTree.append(...sequence)

  // Calculate big manual root
  const raise = (array, length) => {
    const result = []
    for (let i = 0; i < length; i += 2) {
      result.push(hashcat(
        array[i] ?? array[array.length - 1],
        array[i + 1] ?? array[array.length - 1]
      ))
    }
    return result
  }
  const L0 = sequence.map(blake2b)
  const L1 = raise(L0, 128)
  const L2 = raise(L1, 64)
  const L3 = raise(L2, 32)
  const L4 = raise(L3, 16)
  const L5 = raise(L4, 8)
  const L6 = raise(L5, 4)
  const manualBigRoot = hashcat(L6[0], L6[1])

  // Large tail
  expect(bigMerkleTree.root)
    .toEqual(manualBigRoot)
})

test('Merkle tree convenience accessors', () => {
  const merkleTree = new MerkleTree
  merkleTree.append(...blocks)

  // Access leaves layer
  expect(merkleTree.leaves.length)
    .toBe(blocks.length)

  // Check for leaf inclusion
  expect(merkleTree.has(blocks[2]))
    .toBe(true)
  expect(merkleTree.has(Uint8Array.from(blocks[3])))
    .toBe(true)
  expect(merkleTree.has(new Uint8Array([ 0, 55 ])))
    .toBe(false)

  // Access internal nodes
  expect(merkleTree.node(0, 1))
    .toEqual(hashcat(
      blake2b(blocks[0]),
      blake2b(blocks[1])
    ))
  expect(merkleTree.node(1000, 1000))
    .toBe(undefined)
})

test('Merkle tree path generation', () => {
  const merkleTree = new MerkleTree
  merkleTree.append(...blocks)

  // Iteratively test each path
  for (const path of merkleTree.paths()) {
    let result = path.leaf
    for (const [ relation, sibling ] of path.steps) {
      switch (relation) {
        case 0:
          result = hashcat(result, sibling)
          break
        case 1:
          result = hashcat(sibling, result)
          break
      }
    }
    expect(result)
      .toEqual(path.root)
    expect(path.root)
      .toEqual(merkleTree.root)
  }
})
