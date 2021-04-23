#!/usr/bin/env node

const fs = require('fs/promises')
const { createReadStream } = require('fs')
const fetch = require('node-fetch')
const parseArgs = require('minimist')
const { createHash } = require('crypto')
const { Proof } = require('@tzstamp/proof')
const { Hex } = require('@tzstamp/helpers')

const argv = parseArgs(process.argv.slice(2), {
  alias: {
    'root-format': 'rootFormat'
  },
  default: {
    server: 'https://tzstamp.io',
    rootFormat: 'base58'
  }
})

const SHA256_REGEX = /^[0-9a-fA-F]{64}$/
const HTTP_REGEX = /^https?:\/\//

const [ subcommand, ...subcommandArgs ] = argv._

// Subcommand delegation
void async function () {
  switch (subcommand) {
    case 'derive':
      await handleDerive(...subcommandArgs)
      break
    case 'verify':
      await handleVerify(...subcommandArgs)
      break
    case 'stamp':
      await handleStamp(subcommandArgs)
      break
    case 'help':
    default:
      handleHelp()
  }
}().catch(handleError)

/**
 * Asynchronously SHA-256 hash a read stream
 *
 * @param {ReadableStream} stream Readable stream
 * @returns {Promise<Uint8Array>} SHA-256 digest
 */
function sha256Async (stream) {
  return new Promise((resolve, reject) => {
    if (stream.readableEnded) {
      reject(new Error('Stream has ended'))
    }
    const hash = createHash('SHA256')
    stream
      .on('data', data => hash.update(data))
      .on('end', () => resolve(new Uint8Array(hash.digest())))
      .on('error', reject)
  })
}

/**
 * Asynchronously hash a file from read stream
 *
 * @param {string} path File path
 * @return {Promise<Uint8Array>} SHA-256 digest
 */
function hashFile (path) {
  const stream = createReadStream(path)
  return sha256Async(stream)
}

function rootFormat (merkleRoot) { // eslint-disable-line no-unused-vars
  const hexHash = Hex.stringify(merkleRoot)
  switch (argv.rootFormat) {
    case 'hex':
      return hexHash
    case 'decimal':
      return BigInt('0x' + hexHash)
    case 'binary':
      return BigInt('0x' + hexHash).toString(2)
  }
}

async function handleDerive (target, proofLocation) {
  if (target == undefined) {
    throw new Error('Hash to test for inclusion not given (first argument).')
  }
  if (proofLocation == undefined) {
    throw new Error('Proof to test inclusion against not given (second argument).')
  }
  const hash = await getHash(target)
  const proof = await getProof(proofLocation)
  const block = proof.derive(hash)

  console.log(`Block hash derived from proof:\n${block.address}`)
}

async function handleVerify (target, proofLocation) {
  if (target == undefined) {
    throw new Error('Hash to test for inclusion not given (first argument).')
  }
  if (proofLocation == undefined) {
    throw new Error('Proof to test inclusion against not given (second argument).')
  }
  const hash = await getHash(target)
  const proof = await getProof(proofLocation)
  const block = proof.derive(hash)
  const steps = proof.operations
    .map((op, idx) => `${idx + 1}. ${op}`)
    .join('\n')
  const chainviewer = getChainviewer(block.network)

  console.group('Manual derivation:')
  console.log(steps)
  console.log(`Yields: block "${block.address}" on network "${block.network}"`)
  if (chainviewer) {
    console.log('Chainviewer:', new URL(block.address, chainviewer).href)
  }
  if (block.network != 'NetXdQprcVkpaWU') {
    console.warn('Be careful: timestamp is committed to an alternative network!')
  }
  console.groupEnd()
}

/**
 * Get a file hash
 * @param {string} target Filepath or file hash
 */
async function getHash (target) {
  return target.match(SHA256_REGEX)
    ? Hex.parse(target)
    : await hashFile(target)
}

/**
 * Get a proof
 * @param {string} location Filepath or URL
 */
async function getProof (location) {
  const text = location.match(HTTP_REGEX)
    ? await fetchProofText(location)
    : await fs.readFile(location, 'utf-8')
  return Proof.parse(text)
}

/**
 * Fetch a proof
 * @param {string | URL} url URL
 */
async function fetchProofText (url) {
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  })
  switch (response.status) {
    case 200:
      return await response.text()
    case 202:
      throw new Error('Requested proof is pending publication')
    case 404:
      throw new Error('Requested proof could not be found')
    default:
      throw new Error('Could not fetch proof: ' + response.statusText)
  }
}

/**
 * Get an appropriate chainviewer for a given network
 * @param {string} network Tezos network identifier
 * @returns {string} Chainviewer base URL
 */
function getChainviewer (network) {
  switch (network) {
    case 'NetXSgo1ZT2DRUG':
      return 'https://edo2net.tzkt.io'
    case 'NetXdQprcVkpaWU':
      return 'https://tzkt.io'
  }
}

/**
 * Post file hash to a TzStamp server to be timestamped
 *
 * @param {string} filePathsOrHashes Array of file paths or hashes
 */
async function handleStamp (filePathsOrHashes) {
  for (const filePathOrHash of filePathsOrHashes) {
    const hash = SHA256_REGEX.test(filePathOrHash)
      ? filePathOrHash
      : Hex.stringify(await hashFile(filePathOrHash))
    const response = await fetch(`${argv.server}/api/stamp`, {
      method: 'POST',
      headers: { 'Content-type': 'application/json' },
      body: JSON.stringify({ hash })
    })

    const { url } = await response.json()
    console.log(url)
  }
}

function handleHelp () {
  console.log('Was not a recognized subcommand.')
}

/**
 * Print error messages
 *
 * @param {Error} error Thrown error
 * @returns {never} Terminate script with exit code 1
 */
function handleError (error) {
  // if (error instanceof TypeError && subcommand === 'stamp') {
  //   console.error('No filepath to stamp provided, at least one required.')
  //   console.error(subcommandArgs)
  // }
  console.error(error.message)
  process.exit(1)
}
