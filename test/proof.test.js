const { Proof } = require('../dist/proof')
const { Operation } = require('../dist/operation')
const { createHash } = require('crypto')

const helloProof = {
  version: 0,
  network: 'NetXSgo1ZT2DRUG',
  ops: [
    [ 'sha-256' ],
    [ 'prepend', '0ee6cc343703bb63f024a84c5818cfd9dc7104007fa03b4fd645a1ad36609277' ],
    [ 'sha-256' ],
    [ 'prepend', '515ae4da1102a705620b70ac3a058b899afcb298a49a5104f91ebb287da63e9a' ],
    [ 'sha-256' ],
    [ 'append', '4970766a334375bffb9fa2085711c0f8ab8ef3ee7f7f4158d58ad8c44a6b3a16' ],
    [ 'sha-256' ],
    [ 'prepend', 'cdaa8dd4653439d8f139e6e9ef74542fd0d7e9fdaa0cb7635b5c5aba944ec9f06b00800af1bbdba836717c8d83c015bf402a5d303fe78c0bf7ad0fe8520000ad4aebb150a154d8d30d276cb93465611bf29a83eacaeae8cbd63612c83b64d86c00800af1bbdba836717c8d83c015bf402a5d303fe7c405f8ad0fc8184700010d98d95f726b65e40199645d719aa85085e9c8c800ff00000000250a00000020' ],
    [ 'append', 'c71d2ba19266f79dd17adec3da4971a532f0afcf94362d139f94736f3d69de3db94dbd1501f23e40dfccbc8d4673fdd62b1d7a34f8f4f0857efabc17f6c37300' ],
    [ 'blake2b' ],
    [ 'blake2b' ],
    [ 'prepend', 'b02aa9be34566dd338702241db7f3aa03cc56ed87b7184150b625b3b0c804611' ],
    [ 'blake2b' ],
    [ 'blake2b' ],
    [ 'prepend', '7c09f7c4d76ace86e1a7e1c7dc0a0c7edcaa8b284949320081131976a87760c3' ],
    [ 'blake2b' ],
    [ 'prepend', '7c76e3fea03f97235c50832af8e820b1780188c680cdb5aaaab528d741387ada' ],
    [ 'blake2b' ],
    [ 'prepend', '00016ed501cdaa8dd4653439d8f139e6e9ef74542fd0d7e9fdaa0cb7635b5c5aba944ec9f000000000605252db04' ],
    [ 'append', '000000110000000101000000080000000000016ed4b803dfa0fe01418b3bc63201b02b9e2eba55bd7aba6a7150c01f4bd9ff3f2b3000006102c8084a370300007c93824249aac0c43ba61455c604ff0fe0219d33548216f651a543b68ba3bcd6147636b7637351c5bf8f3ba2b43bac64235eee8ed2259d467ec45472749e4a0a' ],
    [ 'blake2b' ]
  ]
}

test('Proof construction', () => {

  // Correct proof
  expect(new Proof('NetXdQprcVkpaWU', [ Operation.sha256() ]))
    .toBeInstanceOf(Proof)

  // Empty operations
  expect(() => new Proof('NetXdQprcVkpaWU', []))
    .toThrow('Empty operations array')

  // Network ID cannot be decoded and checked
  expect(() => new Proof('abc', [ Operation.sha256() ]))
    .toThrow('Invalid network ID')

  // Decoded network ID is wrong length
  expect(() => new Proof('2LVJ4JR2W', [ Operation.sha256() ]))
    .toThrow('Invalid network ID')

  // Decoded network ID has wrong prefix
  expect(() => new Proof('NsA1RF51pJCZxfm', [ Operation.sha256() ]))
    .toThrow('Invalid network ID')
})

test('Proof serialization and deserialization', () => {
  const json = JSON.stringify(helloProof)

  // Parse good serialized proof
  const proof = Proof.parse(json)
  expect(proof)
    .toBeInstanceOf(Proof)

  // Serialize proof
  expect(JSON.stringify(proof))
    .toBe(json)

  // Parse bad JSON
  expect(() => Proof.parse('bad json'))
    .toThrow(SyntaxError)

  // Parse invalid formats
  expect(() => Proof.parse('true'))
    .toThrow('Invalid proof format')
  expect(() => Proof.parse('null'))
    .toThrow('Invalid proof format')

  const adjust = (key, value) => {
    const data = JSON.parse(json)
    data[key] = value
    return JSON.stringify(data)
  }

  // Parse invalid version
  expect(() => Proof.parse(adjust('version', undefined)))
    .toThrow('Missing proof version')
  expect(() => Proof.parse(adjust('version', '1.0')))
    .toThrow('Invalid proof version')
  expect(() => Proof.parse(adjust('version', 12.5)))
    .toThrow('Invalid proof version')
  expect(() => Proof.parse(adjust('version', -1)))
    .toThrow('Invalid proof version')

  // Parse unsupported version
  expect(() => Proof.parse(adjust('version', Proof.VERSION + 1)))
    .toThrow('Unsupported proof version')

  // Parse with invalid operations
  expect(() => Proof.parse(adjust('ops', undefined)))
    .toThrow('Missing operations array')
  expect(() => Proof.parse(adjust('ops', [])))
    .toThrow('Empty operations array')
  expect(() => Proof.parse(adjust('ops', [ 'single-layer-array' ])))
    .toThrow('Invalid operations array')
  expect(() => Proof.parse(adjust('ops', [[]])))
    .toThrow('Invalid operations array')
  expect(() => Proof.parse(adjust('ops', [[ 'unsupported-op' ]])))
    .toThrow('Unsupported operation')

  // Parse with missing network field
  expect(() => Proof.parse(adjust('network', undefined)))
    .toThrow('Missing network ID')
})

test('Derive block from proof', () => {
  const json = JSON.stringify(helloProof)
  const proof = Proof.parse(json)
  const bytes = new Uint8Array([ 104, 101, 108, 108, 111 ])
  const input = new Uint8Array(
    createHash('sha256')
      .update(bytes)
      .digest()
  )
  const block = proof.derive(input)
  expect(block.address)
    .toBe('BLCkrrtSHYoLMJ5k5N6urr3kd5QR8k9uFZ3iBqqoLEaNz3t3BJA')
})
