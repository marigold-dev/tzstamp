const { Proof, Operation } = require('../dist/common')

void async function () {

  console.group('Construction:')
  const proof = new Proof({
    chainID: 'NetXgtSLGNJvNye',
    blockHash: 'BLasdfasdfasfasdfasdf',
    operationHash: 'asdfasdfasdfasdafsdf',
    operations: [
      Operation.sha256(),
      Operation.sha256(),
      Operation.prepend(new Uint8Array([ 35, 16, 139 ])),
      Operation.append(new Uint8Array([ 94, 94, 0, 0 ]))
    ]
  })
  console.log(proof.chainID, proof.blockHash, proof.operationHash)
  console.log(proof.operations.map(String))
  console.groupEnd()

  console.group('Serialization:')
  const json = JSON.stringify(proof, null, '  ')
  console.log(json)
  console.groupEnd()

  console.group('Parsing:')
  const proofRevived = Proof.parse(json)
  console.log(proofRevived.chainID, proofRevived.blockHash, proofRevived.operationHash)
  console.log(proofRevived.operations.map(String))
  console.groupEnd()

  console.group('Derivation:')
  const input = new Uint8Array([ 1, 2, 3 ])
  console.log('original:', await proof.derive(input))
  console.log('revived:', await proofRevived.derive(input))
  console.groupEnd()
}()
