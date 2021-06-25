const fs = require('fs/promises')
const { TezosToolkit } = require('@taquito/taquito')
const { InMemorySigner, importKey } = require('@taquito/signer')

/**
 * Configures a Tezos client
 *
 * @param {string | undefined} secret
 * @param {string | undefined} keyFile
 * @param {string} rpcURL
 */
exports.configureTezosClient = async function (secret, keyFile, rpcURL) {
  const client = new TezosToolkit(rpcURL)
  if (secret != undefined) {
    console.log('Configuring local signer')
    const signer = await InMemorySigner.fromSecretKey(secret)
    client.setProvider({ signer })
  } else if (keyFile != undefined) {
    console.log('Importing key file')
    const contents = await fs.readFile(keyFile, 'utf-8')
    const key = JSON.parse(contents)
    await importKey(
      client,
      key.email,
      key.password,
      key.mnemonic.join(' '),
      key.secret
    )
  } else {
    throw new Error('Either the KEY_FILE or SECRET environment variable must be set')
  }
  return client
}
