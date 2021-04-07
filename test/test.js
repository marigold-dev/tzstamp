const { Hex } = require('@tzstamp/helpers')
const { Proof, Operation } = require('../dist/common')
const { createHash } = require('crypto')

void async function () {

  console.group('\nConstruction:')
  const proof = new Proof('NetXSgo1ZT2DRUG', [
    Operation.sha256(),
    Operation.prepend(Hex.parse('0ee6cc343703bb63f024a84c5818cfd9dc7104007fa03b4fd645a1ad36609277')),
    Operation.sha256(),
    Operation.prepend(Hex.parse('515ae4da1102a705620b70ac3a058b899afcb298a49a5104f91ebb287da63e9a')),
    Operation.sha256(),
    Operation.append(Hex.parse('4970766a334375bffb9fa2085711c0f8ab8ef3ee7f7f4158d58ad8c44a6b3a16')),
    Operation.sha256(),
    Operation.prepend(Hex.parse('cdaa8dd4653439d8f139e6e9ef74542fd0d7e9fdaa0cb7635b5c5aba944ec9f06b00800af1bbdba836717c8d83c015bf402a5d303fe78c0bf7ad0fe8520000ad4aebb150a154d8d30d276cb93465611bf29a83eacaeae8cbd63612c83b64d86c00800af1bbdba836717c8d83c015bf402a5d303fe7c405f8ad0fc8184700010d98d95f726b65e40199645d719aa85085e9c8c800ff00000000250a00000020')),
    Operation.append(Hex.parse('c71d2ba19266f79dd17adec3da4971a532f0afcf94362d139f94736f3d69de3db94dbd1501f23e40dfccbc8d4673fdd62b1d7a34f8f4f0857efabc17f6c37300')),
    Operation.blake2b(),
    Operation.blake2b(),
    Operation.prepend(Hex.parse('b02aa9be34566dd338702241db7f3aa03cc56ed87b7184150b625b3b0c804611')),
    Operation.blake2b(),
    Operation.blake2b(),
    Operation.prepend(Hex.parse('7c09f7c4d76ace86e1a7e1c7dc0a0c7edcaa8b284949320081131976a87760c3')),
    Operation.blake2b(),
    Operation.prepend(Hex.parse('7c76e3fea03f97235c50832af8e820b1780188c680cdb5aaaab528d741387ada')),
    Operation.blake2b(),
    Operation.prepend(Hex.parse('00016ed501cdaa8dd4653439d8f139e6e9ef74542fd0d7e9fdaa0cb7635b5c5aba944ec9f000000000605252db04')),
    Operation.append(Hex.parse('000000110000000101000000080000000000016ed4b803dfa0fe01418b3bc63201b02b9e2eba55bd7aba6a7150c01f4bd9ff3f2b3000006102c8084a370300007c93824249aac0c43ba61455c604ff0fe0219d33548216f651a543b68ba3bcd6147636b7637351c5bf8f3ba2b43bac64235eee8ed2259d467ec45472749e4a0a')),
    Operation.blake2b()
  ])
  console.log('Network:', proof.network)
  console.log('Operations:')
  console.log(proof.operations.map((op, idx) => `${idx + 1}. ${op}`).join('\n'))
  console.groupEnd()

  console.group('\nSerialization:')
  const json = JSON.stringify(proof, null, '  ')
  console.log(json)
  console.groupEnd()

  console.group('\nParsing:')
  const proofRevived = Proof.parse(json)
  console.log('Network:', proofRevived.network)
  console.log('Operations:')
  console.log(proofRevived.operations.map((op, idx) => `${idx + 1}. ${op}`).join('\n'))
  console.groupEnd()

  console.group('\nDerivation:')
  const message = 'hello'
  const encodedMessage = new TextEncoder('utf-8').encode(message)
  const input = new Uint8Array(
    createHash('SHA256')
      .update(encodedMessage)
      .digest()
  )
  const block = proof.derive(input)
  console.log('Block hash:', Hex.stringify(block.hash))
  console.log('Block address:', block.address)
  console.groupEnd()

  console.group('\nLookup:')
  try {
    console.log('Fetching...')
    const timestamp = await block.lookup('https://testnet-tezos.giganode.io')
    console.log('Verified!')
    console.log(`The message "${message}" was commited to Tezos network "${block.network}" in block "${block.address}" on ${timestamp.toLocaleDateString('en-US')} at ${timestamp.toLocaleTimeString('en-US')}`)
  } catch (status) {
    throw new Error(`Unable to verify. Server returned status ${status}`)
  }
  console.groupEnd()
}()
