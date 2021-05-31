const { randomBytes } = require('crypto')
const { Hex, blake2b } = require('@tzstamp/helpers')
const { exec } = require('child_process')

const { NODE_URI } = process.env
const { FAUCET_PATH } = process.env
const NODE_FLAG = `--node ${NODE_URI || 'https://testnet-tezos.giganode.io'}`
const FAUCET_FLAG = `--faucet ${FAUCET_PATH}`

void async function () {

  // Create and store mock files
  // Files are named "fileN.dat" and stored in the temp directory
  // Each file is 1KB of random bytes
  console.log('Generating mock file hashes')
  const fakeFileHashes = []
  for (let i = 0; i < 6; ++i) {
    const contents = Uint8Array.from(randomBytes(1024))
    fakeFileHashes.push(Hex.stringify(blake2b(contents)))
  }

  // Deploy kt1
  // Invoke "deploy" subcommand with variety of argument types
  // Move on once all commands have completed
  console.log('Deploying contracts')
  const deployments = [
    await deploy('noop'), // $ tzstamp-manage deploy noop
  ]

  // Manual hash uploads
  // Invoke "upload-hash" subcommand on temporary file hashes
  console.log('Manually uploading hashes')
  for (const kt1 of deployments) {
    for (const fakeFileHash of fakeFileHashes) {
      await upload(kt1, fakeFileHash)
    }
  }

  console.log('All tests passed')
  process.exit(0)

}().catch(handleError)

/**
 * Originate a tzstamp contract
 */
async function deploy (contractName) {
  const [ stdout, stderr ] = await execTzstamp(`deploy ${contractName}`)
  expect(!stderr, `Stderr while deploying ${contractName}: ${stderr}`)
  const kt1Regex = new RegExp('(KT1.+)...')
  const kt1 = stdout.match(kt1Regex)
  try {
    kt1[1]
  } catch (error) {
    throw new Error(`Wrong stdout while deploying ${contractName}: ${stdout}`)
  }
  expect(
    kt1[1].length == 36,
    `Wrong stdout while deploying ${contractName}: ${stdout}`
  )
  return kt1[1]
}

/**
 * Manually upload a hash to tzstamp contract
 */
async function upload (kt1, uploadHash) {
  const [ stdout, stderr ] = await execTzstamp(`upload-hash ${kt1} ${uploadHash}`)
  expect(!stderr, `Stderr while uploading ${uploadHash}: ${stderr}`)
  const opRegex = new RegExp('Operation injected')
  const opMsg = stdout.match(opRegex)
  expect(
    opMsg[0] === 'Operation injected',
    `Wrong stdout while uploading ${uploadHash}: ${stdout}`
  )
  return
}

/**
 * Execute tzstamp-manage CLI command
 */
function execTzstamp (args) {
  return new Promise((resolve, reject) => {
    exec(`node . ${NODE_FLAG} ${FAUCET_FLAG} ${args}`, (error, stdout, stderr) => {
      if (error) {
        reject(error)
      } else {
        resolve([ stdout, stderr ])
      }
    })
  })
}

/**
 * Expect truthy expression
 */
function expect (expr, message) {
  if (!expr) {
    throw new Error(message)
  }
}

/**
 * Handle cleanup after test errors
 */
async function handleError (error) {
  console.error(error.stack)
  process.exit(1)
}
