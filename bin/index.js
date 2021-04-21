#!/usr/bin/env node

const fs = require('fs/promises')
const { createReadStream } = require('fs')
const fetch = require('node-fetch')
const parseArgs = require('minimist')
const { createHash } = require('crypto')
const { Proof } = require('@tzstamp/proof')
const { Hex, Base58 } = require('@tzstamp/helpers')

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

async function fetchProofSerialization (url) {
  const response = await fetch(url)
  if (response.status == 404) {
    throw new Error(`Requested proof "${url}" hasn't been posted to tzstamp server or has expired`)
  } else if (response.status == 202) {
    throw new Error(`Requested proof "${url}" will be posted with the next merkle root`)
  }
}

function rootFormat (merkleRoot) {
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

async function handleDerive (hashOrFilepath, proofFileOrURL) {
  if (hashOrFilepath == undefined) {
    throw new Error('Hash to test for inclusion not given (first argument).')
  }
  if (proofFileOrURL == undefined) {
    throw new Error('Proof to test inclusion against not given (second argument).')
  }
  // Determine what arguments we've been passed
  const hash = hashOrFilepath.match(SHA256_REGEX)
    ? Hex.parse(hashOrFilepath)
    : await hashFile(hashOrFilepath)
  const proofSerialization = proofFileOrURL.match(HTTP_REGEX)
    ? await fetchProofSerialization(proofFileOrURL)
    : await fs.readFile(proofFileOrURL, 'utf-8')
  const proof = Proof.parse(proofSerialization)
  const block = proof.derive(hash)

  console.log(`Block hash derived from proof:\n${block.address}`)
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
