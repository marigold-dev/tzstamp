const { Hex, blake2b, concat } = require('@tzstamp/helpers')
const { MerkleTree, Relation } = require('../dist')

const merkleTree = new MerkleTree

// Append blocks
merkleTree.append(
  Hex.parse('4593'),
  Hex.parse('846f'),
  Hex.parse('0051'),
  Hex.parse('1000'),
  Hex.parse('dda5'),
  Hex.parse('83b7'),
  Hex.parse('66bb'),
  Hex.parse('8161'),
  Hex.parse('fff1')
)

// Print root
const rootHex = Hex.stringify(merkleTree.root)
console.log('Root', rootHex)

// Print each
for (const path of merkleTree.paths()) {
  const derivedRoot = path.steps.reduce(derive, path.leaf)
  const derivedRootHex = Hex.stringify(derivedRoot)
  if (rootHex != derivedRootHex)
    throw new Error('Derived root did not match real root')
}

console.log('All roots derived from leaves matched real root.')

function derive (acc, [ relation, sibling ]) {
  switch (relation) {
    case Relation.LEFT:
      return blake2b(concat(sibling, acc))
    case Relation.RIGHT:
      return blake2b(concat(acc, sibling))
  }
}
