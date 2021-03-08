const { Proof } = require('../dist/common')

const serialization = JSON.stringify({
  version: 0,
  ops: [
    ['sha-256'],
    ['sha-256'],
    ['prepend', '000001'],
    ['append', 'ff']
  ]
})

void async function () {

  console.log('\nParsing:')
  const proof = Proof.parse(serialization)
  console.log(proof)

  console.log('\nDerivation:')
  const input = new Uint8Array([ 1, 2, 3 ])
  const root = await proof.derive(input)
  console.log(root)

  console.log('\nSerialization:')
  const json = JSON.stringify(proof, null, '  ')
  console.log(json)
}()
