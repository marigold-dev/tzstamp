const { tmpdir } = require('os')
const { join, sep } = require('path')
const { ProofStorage } = require('../lib/storage')
const { randomUUID } = require('crypto')
const { Proof } = require('@tzstamp/proof')
const { stat } = require('fs/promises')

const dir = join(tmpdir(), 'tzstamp-' + randomUUID())
const proof1 = new Proof({
  hash: new Uint8Array([ 1 ]),
  operations: []
})
let storage

describe('Use proof storage', () => {
  test('Instantiate', () => {
    storage = new ProofStorage(dir)
  })
  test('Calculate a proof path', () => {
    expect(storage.path('foo')).toBe(`${dir}${sep}foo.proof.json`)
  })
  test('Store a proof', async () => {
    await storage.storeProof(proof1, 'foo')
    const fooStat = await stat(storage.path('foo'))
    expect(fooStat.isFile())
  })
  test('Get a proof', async () => {
    const proof2 = await storage.getProof('foo')
    expect(proof2).toEqual(proof1)
    await expect(() => storage.getProof('bar')).rejects.toThrow()
  })
})
