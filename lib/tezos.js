const fs = require('fs/promises')
const { TezosToolkit } = require('@taquito/taquito')
const { InMemorySigner, importKey } = require('@taquito/signer')

/**
 * Configures a Tezos client
 *
 * @param {string | undefined} tezosWalletSecret
 * @param {string | undefined} faucetKeyPath
 * @param {string} rpcURL
 */
exports.configureTezosClient = async function (tezosWalletSecret, faucetKeyPath, rpcURL) {
  const client = new TezosToolkit(rpcURL)
  if (tezosWalletSecret != undefined) {
    console.log('Configuring local signer')
    const signer = await InMemorySigner.fromSecretKey(tezosWalletSecret)
    client.setProvider({ signer })
  } else if (faucetKeyPath != undefined) {
    console.log('Importing testnet key')
    const contents = await fs.readFile(faucetKeyPath, 'utf-8')
    const key = JSON.parse(contents)
    importKey(
      client,
      key.email,
      key.password,
      key.mnemonic.join(' '),
      key.secret
    )
  } else {
    throw new Error('Either the FAUCET_KEY_PATH or TEZOS_WALLET_SECRET environment variable must be set.')
  }
  return client
}
