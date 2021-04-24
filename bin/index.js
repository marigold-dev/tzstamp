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
    'root-format': 'rootFormat',
    'wait': 'w'
  },
  boolean: [ 'wait' ],
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
      handleHelp(...subcommandArgs)
      break
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
  if (target == undefined || proofLocation == undefined) {
    return handleHelp('derive')
  }
  const hash = await getHash(target)
  const proof = await getProof(proofLocation)
  const block = proof.derive(hash)

  console.log(`Block hash derived from proof:\n${block.address}`)
}

async function handleVerify (target, proofLocation) {
  if (target == undefined || proofLocation == undefined) {
    return handleHelp('verify')
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
  if (filePathsOrHashes.length == 0) {
    return handleHelp('stamp')
  }
  const proofURLs = []
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
    const proofURL = argv.wait
      ? longPollProof(url)
      : Promise.resolve(url)
    proofURLs.push(proofURL)
  }
  console.log((await Promise.all(proofURLs)).join('\n'))
}

/**
 * Long poll for proof publication
 */
function longPollProof (url) {
  return new Promise((resolve, reject) => {

    // Query every 30 seconds
    const inteval = setInterval(async () => {
      const response = await fetch(url)
      switch (response.status) {
        case 200:
          clearInterval(inteval)
          resolve(url)
          break
        case 202:
          break
        case 404:
          reject('Requested proof could not be found')
          break
        default:{
          try {
            const text = await response.text()
            throw new Error(text)
          } catch (_) {
            throw new Error(response.statusText)
          }
        }
      }
    }, 30000)
  })
}

/**
 * Wrap string with emphasizing terminal styling escape codes
 */
function em (string) {
  return '\n\u001B[1;4m' + string + '\u001B[0m'
}

/**
 * Print command usage
 *
 * @param {string} command Command name
 */
function handleHelp (command) {
  switch (command) {
    case 'stamp':
      console.log('Submit a hash to a tzstamp server for aggregation')
      console.log('File hashes must be 64-digit hex strings (256 bits)')
      console.log('Prints out a pending proof URL for each file or hash aggregated')
      console.group(em('Usage:'))
      console.log('tzstamp stamp [options] <file|hash> [...<file|hash>]')
      console.groupEnd()
      console.group(em('Options:'))
      console.log('--wait,-w          Wait until all proofs is published before printing output')
      console.groupEnd()
      console.group(em('Examples:'))
      console.log('tzstamp --server https://api.example.com stamp myFile.txt')
      console.log('tzstamp stamp a06281f90dcbc6676a107a6ffd84430769f875019aaff0e6ad68320efa997cc6')
      console.log('tzstamp stamp file0.dat file1.dat file2.dat')
      console.groupEnd()
      break
    case 'derive':
      console.log('Derive a block address from a proof')
      console.log('An incorrect input will still produce a valid block address')
      console.log('Usage a chainviewer to verify that the block hash is commited to a network')
      console.group(em('Usage:'))
      console.log('tzstamp derive <file|hash> <proofFile|URL>')
      console.groupEnd()
      console.group(em('Examples:'))
      console.log('tzstamp derive myFile.text myFile.txt.proof.json')
      // eslint-disable-next-line max-len
      console.log('tzstamp derive file0.dat https://tzstamp.io/api/proof/ca66c425ba36802651386b0f5632c915df54ab626828af1a89238455a689eee3')
      console.log('tzstamp derive 87ca3a133d348045abc294582bd3a2eeadcc51eccd5d19d2b14199e5ad49f075 LOG-8494.proof.json')
      break
    case 'verify':
      console.log('Print manual root derivation from a proof')
      console.log('Interface is identical to the derive subcommand')
      console.log('See "tzstamp help derive" for examples')
      console.group(em('Usage:'))
      console.log('tzstamp verify <file|hash> <proofFile|URL>')
      console.groupEnd()
      break
    case 'help':
      console.log('Print command usage')
      console.group(em('Usage:'))
      console.log('tzstamp help <command>')
      console.groupEnd()
      break
    default:
      console.log(`Unknown command "${command}"\n`) // eslint-disable no-fallthrough
    case undefined:
      console.log('Tezos timestamping utility')
      console.group(em('Usage:'))
      console.log('tzstamp [global options] <command>')
      console.log('Use "tzstamp help <command>" for detailed command usage')
      console.groupEnd()
      console.group(em('Commands:'))
      console.log('tzstamp stamp      Submit a hash to a tzstamp server for aggregation')
      console.log('tzstamp derive     Derive a block address from a proof')
      console.log('tzstamp verify     Print manual block hash derivation from a proof')
      console.log('tzstamp help       Print command usage')
      console.groupEnd()
      console.group(em('Global options:'))
      console.log('--root-format      Set root display format. Values are: hex, binary, decimal')
      console.log('--server           Set tzstamp server URL. Default is "https://tzstamp.io"')
      console.groupEnd()
  }
}

/**
 * Print error messages
 *
 * @param {Error} error Thrown error
 * @returns {never} Terminate script with exit code 1
 */
function handleError (error) {
  console.error(error.message)
  process.exit(1)
}
