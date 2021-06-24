require('dotenv').config()
const { configureTezosClient } = require('../lib/tezos')
const { randomBytes } = require('crypto')
const { Base58 } = require('@tzstamp/helpers')

const {
  RPC_URL: rpcURL = 'https://testnet-tezos.giganode.io/',
  KEY_FILE: keyFile
} = process.env

describe('Configure a tezos client', () => {
  test('with a faucet key', async () => {
    const client = await configureTezosClient(
      undefined,
      keyFile,
      rpcURL
    )
    expect(client.rpc.url).toBe(rpcURL)
  })
  test('with a secret key', async () => {
    const key = Base58.encodeCheck(
      randomBytes(32),
      new Uint8Array([ 13, 15, 58, 7 ])
    )
    await configureTezosClient(key, undefined, rpcURL)
  })
  test('without any key', async () => {
    await expect(async () => {
      await configureTezosClient(undefined, undefined, rpcURL)
    }).rejects.toThrow()
  })
})
