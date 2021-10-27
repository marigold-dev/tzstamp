const fs = require('fs/promises')
const chalk = require('chalk')
const { createReadStream } = require('fs')
const fetch = require('node-fetch')
const { createHash } = require('crypto')
const { Hex } = require('@tzstamp/helpers')
const { Proof } = require('@tzstamp/proof')
const { cwd } = require('process')
const { dirname, resolve } = require('path')

/**
 * Valid 32-64 byte hexadecimal string
 */
const VALID_HASH = /^[0-9a-f]{64,128}$/i

/**
 * Valid http(s) address
 */
const VALID_HTTP = /^https?:\/\//

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

function hashFile (path) {
  const stream = createReadStream(path)
  return sha256Async(stream)
}

/**
 * Normalizes a raw hexadecimal hash or file path into a hash byte array
 *
 * @param {Promise<string>} target File path or file hash
 */
async function getHash (target, verbose) {
  try {
    if (VALID_HASH.test(target)) {
      return Hex.parse(target)
    } else {
      if (verbose) {
        console.log(chalk.dim`Hashing file ${target}`)
      }
      return await hashFile(target)
    }
  } catch (error) {
    throw new Error(`Could not ${VALID_HASH.test(target) ? 'parse' : 'get file'} hash: ${error.message}`)
  }
}

async function fetchProofText (url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json'
    }
  })
  switch (response.status) {
    case 200:
      return await response.text()
    case 202:
      throw new Error('Requested proof is pending publication')
    case 404:
      throw new Error('Requested proof could not be found')
    default:
      throw new Error(`Bad server response ${response.statusText}`)
  }
}

/**
 * Retrieves and parses a proof from a local file or remote URL.
 *
 * @param {string} location Filepath or URL
 * @returns {Promise<Proof>}
 */
async function getProof (location, verbose) {
  // Get proof text
  let text
  if (VALID_HTTP.test(location)) {
    if (verbose) {
      console.log(chalk.dim`Fetching proof from URL ${location}`)
    }
    try {
      text = await fetchProofText(location)
    } catch (error) {
      throw new Error(`Error fetching proof: ${error.message}`)
    }
  } else {
    if (verbose) {
      console.log(chalk.dim`Reading proof from file ${location}`)
    }
    try {
      text = await fs.readFile(location, 'utf-8')
    } catch (error) {
      throw new Error(`Error reading proof file: ${error.message}`)
    }
  }

  // Parse proof
  let json
  if (verbose) {
    console.log(chalk.dim`Parsing proof`)
  }
  try {
    json = JSON.parse(text)
  } catch (_) {
    throw new Error(
      `${
        VALID_HTTP.test(location)
          ? 'Fetched proof'
          : 'Proof file'
      } is not valid JSON`
    )
  }
  if (json instanceof Object && json.version === 0) {
    throw new Error(
      'Unable to parse version 0 proofs. Use <https://github.com/marigold-dev/tzstamp/tree/main/upgrade> to upgrade the proofs manually.'
    )
  }
  return Proof.from(json)
}

/**
 * Gets an appropriate fallback Tezos node.
 *
 * @param {string} network
 * @returns {string} Tezos node URL
 */
function getNode (network) {
  switch (network) {
    case 'NetXdQprcVkpaWU':
      return 'https://mainnet.api.tez.ie/'
    case 'NetXz969SFaFn8k':
      return 'https://granadanet.api.tez.ie/'
    case 'NetXxkAx4woPLyu':
      return 'https://florencenet.api.tez.ie/'
  }
}

/**
 * Gets an appropriate indexer.
 *
 * @param {string} network
 * @returns {string|undefined} Indexer URL
 */
function getIndexer (network) {
  switch (network) {
    case 'NetXdQprcVkpaWU':
      return 'http://tzkt.io/'
    case 'NetXz969SFaFn8k':
      return 'https://granadanet.tzkt.io/'
    case 'NetXxkAx4woPLyu':
      return 'https://florencenet.tzkt.io/'
    case 'NetXSgo1ZT2DRUG':
      return 'https://edo2net.tzkt.io/'
  }
}

function *nameCandidates (base) {
  yield `${base}.proof.json`
  for (let i = 1;; ++i) {
    yield `${base}-${i}.proof.json`
  }
}

function *safeNames (target, directory, entries) {
  for (const name of nameCandidates(target)) {
    if (entries.includes(name)) {
      continue
    }
    yield resolve(directory, name)
  }
}

/**
 * Creates a generator of safe file names to store proofs under.
 *
 * @param {string} fileOrDir
 * @returns {Promise<Generator<string>>} File name
 */
async function getSafeNames (target, directory, verbose) {
  // Resolve directory
  let dir = directory
  if (directory == undefined) {
    if (VALID_HASH.test(target)) {
      dir = cwd()
    } else {
      const fullTarget = resolve(target)
      if (verbose) {
        console.log(chalk.dim`Inspecting path ${fullTarget}`)
      }
      const stat = await fs.stat(fullTarget)
      dir = stat.isDirectory()
        ? target
        : dirname(fullTarget)
    }
  }

  // Get directory listing
  if (verbose) {
    console.log(chalk.dim`Reading directory ${dir}`)
  }
  const entries = await fs.readdir(dir)

  // Produce safe name
  return safeNames(target, dir, entries)
}

module.exports = {
  getHash,
  getProof,
  getNode,
  getIndexer,
  getSafeNames
}
