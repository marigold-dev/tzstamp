const { MerkleTree } = require('../dist')

const merkle = new MerkleTree
console.log('Appending 1,000,000 blocks')
console.time('append')
for (let i = 1; i <= 1_000_000; ++i) {
  const block = new Uint8Array([
    (i >> 16) % 256,
    (i >> 8) % 256,
    i % 256
  ])
  merkle.append(block)
  if (i % 10_000 == 0)
    console.timeLog('append', `${merkle.size.toLocaleString('en-US')} blocks appended`)
}
