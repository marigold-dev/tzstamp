const path = require('path')
const fs = require('fs/promises')
const os = require('os')
const { randomBytes } = require('crypto')
const { Hex, blake2b } = require('@tzstamp/helpers')
const { Proof } = require('@tzstamp/proof')
const { exec } = require('child_process')
const fetch = require('node-fetch')

const { SERVER } = process.env
const SERVER_FLAG = `--server ${SERVER || 'http://localhost:8080'}`
const HTTP_STRING = /^https?:\/\//

void async function () {

  // Setup temp storage directory
  // This will be a folder with random suffix,
  // in the format of "tzstamp-xxxxxx" in your OS's default temp directory
  console.log('Creating temporary directory')
  const tempPath = path.join(os.tmpdir(), 'tzstamp-')
  const tempDir = await fs.mkdtemp(tempPath)
  console.log(`Created temporary directory at "${tempDir}"`)

  // Create and store mock files
  // Files are named "fileN.dat" and stored in the temp directory
  // Each file is 1KB of random bytes
  console.log('Generating mock files')
  const files = []
  for (let i = 0; i < 6; ++i) {
    const contents = Uint8Array.from(randomBytes(1024))
    const fileName = `file${i}.dat`
    const filePath = path.join(tempDir, fileName)

    // File entries
    files.push({
      name: fileName,
      path: filePath,
      hash: Hex.stringify(blake2b(contents)),
      contents
    })

    // Write to temp dir
    await fs.writeFile(filePath, contents)
  }

  // Stamp files
  // Invoke "stamp" subcommand with variety of argument types
  // Move on once all commands have completed
  console.log('Stamping files')
  const proofURLs = await Promise.all([
    stamp('stamping single file', files[0].path), // $ tzstamp stamp <file>
    stamp('stamping single file hash', files[1].hash), // $ tzstamp stamp <fileHash>
    stamp( // $ tzstamp stamp <file> <file> <fileHash> <fileHash>
      'stamping multiple files and hashes',
      files[2].path,
      files[3].path,
      files[4].hash,
      files[5].hash
    )
  ])
  const fileProofURL = proofURLs[0][0]
  const hashProofURL = proofURLs[1][0]
  const mixedProofURLs = proofURLs[2]

  // Wait for publication
  // Check for status 200 on each proof every 30 seconds
  // Move on once JSON of all proofs has been fetched
  console.log('Waiting for publication')
  const [
    fileProof,
    hashProof,
    ...mixedProofs
  ] = await Promise.all([
    waitProof(fileProofURL),
    waitProof(hashProofURL),
    ...mixedProofURLs.map(waitProof)
  ])

  // Store proofs
  // These will be stored in the temp dir alongside the mock files
  // Name format is "fileN.dat.proof.json", corresponding with the original files
  // Move on once all files are parsed and stored
  console.log('Storing proofs')
  await Promise.all([
    storeProof(files[0].path, fileProof),
    storeProof(files[1].path, hashProof),
    mixedProofs.map((proof, idx) => storeProof(files[idx + 2], proof))
  ])

  // Verify proofs
  // Invoke "derive" subcommand with a variety of argument types
  console.log('Verifying proofs')
  await Promise.all([
    verify( // $ tzstamp derive <file> <file>
      'file proof from storage',
      files[0].path,
      files[0].path + '.proof.json'
    ),
    verify( // $ tzstamp derive <fileHash> <file>
      'hash proof from storage',
      files[1].hash,
      files[1].path + '.proof.json'
    ),
    verify( // $ tzstamp derive <file> <url>
      'file proof from URL',
      files[2].path,
      mixedProofURLs[0]
    ),
    verify( // $ tzstamp derive <file> <url>
      // (using a file passed as a fileHash in the multiple file test)
      'hash proof from URL',
      files[4].path,
      mixedProofURLs[2]
    )
  ])

  console.log('All tests passed')
  process.exit(0)

}().catch(handleError)

/**
 * Stamp a files or hashes
 */
async function stamp (action, ...targets) {
  const [ stdout, stderr ] = await execTzstamp(`stamp ${targets.join(' ')}`)
  expect(!stderr, `Stderr while ${action}: ${stderr}`)
  const urls = stdout
    .trim()
    .split('\n')
    .map(url => url.trim())
  expect(
    urls.every(url => url.match(HTTP_STRING)),
    `Wrong stdout while ${action}: ${stdout}`
  )
  return urls
}

/**
 * Verify a proof by deriving a block
 */
async function verify (action, target, location) {
  const [ stdout, stderr ] = await execTzstamp(`derive ${target} ${location}`)
  expect(!stderr, `Stderr while ${action}: ${stderr}`)
  expect(
    stdout.trim().startsWith('Block hash derived from proof'),
    `Wrong stdout while verifying ${action}: ${stdout}`
  )
}

/**
 * Store a proof
 */
function storeProof (origPath, proof) {
  const text = JSON.stringify(proof)
  return fs.writeFile(origPath + '.proof.json', text)
}

/**
 * Execute tzstamp CLI command
 */
function execTzstamp (args) {
  return new Promise((resolve, reject) => {
    exec(`node . ${SERVER_FLAG} ${args}`, (error, stdout, stderr) => {
      if (error) {
        reject(error)
      } else {
        resolve([ stdout, stderr ])
      }
    })
  })
}

/**
 * Wait for proof to be published
 */
function waitProof (proofURL) {
  return new Promise((resolve, reject) => {
    setInterval(async () => {
      const response = await fetch(proofURL, {
        headers: { 'Accept': 'application/json' }
      })
      switch (response.status) {
        case 200: {
          const text = await response.text()
          const proof = Proof.parse(text)
          resolve(proof)
          return
        }
        case 202:
          return
        default: {
          try {
            reject(response.json())
          } catch (_) {
            reject(response.statusText)
          }
        }
      }
    }, 30000)
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
