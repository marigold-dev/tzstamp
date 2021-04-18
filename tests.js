const crypto = require('crypto')
const { spawn } = require('child_process')
const fetch = require('node-fetch')
const { Proof } = require('@tzstamp/proof')
const { Hex } = require('@tzstamp/helpers')
require('dotenv-defaults').config()

const {
  BASE_URL,
  RPC_URL
} = process.env

// UTF-8 text decoder
const decoder = new TextDecoder('utf-8')

// Start server in detached thread
console.log('Starting server on detached thread')
const server = spawn('node', [ 'index.js' ], { detached: true })
let proofsFlag = false

// Capture server stdout
server.stdout.on('data', data => {
  const text = decoder.decode(data)
  console.log('SERVER LOG:', text.slice(0, -1))

  // Begin tests when the RESTful API is ready
  if (text.startsWith('Serving on port')) {
    runTests().catch(error => {
      server.kill()
      throw error
    })
  }

  // Set proofs flag on successful publication
  if (text.startsWith('Operation for')) {
    proofsFlag = true
  }
})

// Capture server stderr
server.stderr.on('data', data => {
  const text = decoder.decode(data)
  console.log('SERVER ERROR:', text.slice(0, -1))
})

// Capture server closeing
server.on('close', code => {
  console.log('SERVER EXIT:', code)

  // Server did not close gracefully
  if (code != 0) {
    process.exit(1)
  }
})

// Tests mananger
async function runTests () {

  // Mock file hashes
  const fileHashes = []
  for (let i = 0; i < 20; ++i) {
    const bytes = new Uint8Array(crypto.randomBytes(32))
    fileHashes.push(bytes)
  }

  await fetchMissingProof(fileHashes[0])
  const proofURLs = await postFiles(fileHashes)
  await queryPendingProofs(proofURLs)
  await proofsReady()
  const proofs = await fetchProofs(proofURLs)
  await verifyProofs(fileHashes, proofs)

  console.log('All tests passed')
  server.kill()
  process.exit(0)
}

// Fetch a non-existant proof
async function fetchMissingProof (fileHash) {
  const proofId = Hex.stringify(fileHash)
  const url = new URL(`/api/proof/${proofId}`, BASE_URL)
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  })
  expect(response.status == 404, 'Fetching a non-existant proof did not yield a response status of 404')
  console.log('Fetching non-existant proof yielded status 404')
}

// Stamp mock file hashes
async function postFiles (fileHashes) {
  const proofURLs = []
  for (const fileHash of fileHashes) {
    const url = new URL(`/api/stamp`, BASE_URL)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        hash: Hex.stringify(fileHash)
      })
    })
    expect(response.status == 202, 'Posting a file hash to be timestamped did not yield a response status of 202')
    const json = await response.json()
    proofURLs.push(json.url)
  }
  console.log(`Posted ${fileHashes.length} mock file hashes to be timestamped`)
  return proofURLs
}

// Fetching pending proofs
async function queryPendingProofs (proofURLs) {
  for (const url of proofURLs) {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    })
    expect(response.status == 202, 'Fetching a pending proof did not yield a response status of 202')
    const json = await response.json()
    expect(json.status == 'Stamp pending', 'Pending proof query showed wrong status')
    expect(json.url == url, 'Pending proof query showed contradictory proof URL')
  }
  console.log(`Queried ${proofURLs.length} pending proofs`)
}

// Wait for proofs to be ready
function proofsReady () {
  console.log('Waiting for next root publication...')
  return new Promise(resolve => {
    setInterval(() => {
      if (proofsFlag) {
        proofsFlag = false
        resolve()
      }
    }, 100)
  })
}

// Fetch proofs
async function fetchProofs (proofURLs) {
  const proofs = []
  for (const url of proofURLs) {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    })
    expect(response.status == 200, 'Fetching a proof did not yield a response status of 200')
    const text = await response.text()
    try {
      const proof = Proof.parse(text)
      proofs.push(proof)
    } catch (error) {
      expect(false, `Could not parse proof: "${error.message}"`)
    }
  }
  console.log(`Fetched and parsed ${proofURLs.length} proofs for mock file hashes`)
  return proofs
}

// Verify proofs
async function verifyProofs (fileHashes, proofs) {
  for (const index in fileHashes) {
    const fileHash = fileHashes[index]
    const proof = proofs[index]
    const block = proof.derive(fileHash)
    // console.log('DEBUG verifyProofs:', fileHash)
    try {
      const timestamp = await block.lookup(RPC_URL)
    } catch (status) {
      switch (status) {
        case 404:
          expect(false, `Could not verify proof. Block header could not be found.`)
        default:
          expect(false, `Could not verify proof. RPC returned status code "${status}"`)
      }
    }
  }
  console.log(`Verified ${fileHashes.length} proofs for mock file hashes`)
}

function expect (expr, message) {
  if (!expr) {
    server.kill()
    console.error(message)
    process.exit(1)
  }
}
