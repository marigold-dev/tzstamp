const { Hex, blake2b, concat } = require('@tzstamp/helpers')
const { MerkleTree, Relation } = require('../dist')

const merkle = new MerkleTree

const blocks = [
  Hex.parse('4593'),
  Hex.parse('846f'),
  Hex.parse('0051'),
  Hex.parse('1000'),
  Hex.parse('dda5'),
  Hex.parse('83b7'),
  Hex.parse('66bb'),
  Hex.parse('8161'),
  Hex.parse('fff1')
]

merkle.append(...blocks)
console.log(Hex.stringify(merkle.root))

const walks = blocks.map(block => merkle.walk(block))
console.log(walks)

const roots = walks.map((walk, index) => {
  return walk.reduce((acc, [ relation, sibling ]) => {
    switch (relation) {
      case Relation.LEFT:
        return blake2b(concat(sibling, acc))
      case Relation.RIGHT:
        return blake2b(concat(acc, sibling))
    }
  }, blake2b(blocks[index]))
})
console.log(roots.map(Hex.stringify))
