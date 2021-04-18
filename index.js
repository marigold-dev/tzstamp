#!/usr/bin/env node

const fs = require('fs/promises')
const fetch = require('node-fetch')
require('dotenv-defaults').config()
const { MerkleTree } = require('@tzstamp/tezos-merkle')
const { Hex, blake2b, Base58, concat } = require('@tzstamp/helpers')
const { Proof, Operation } = require('@tzstamp/proof')
const Koa = require('koa')
const Router = require('@koa/router')
const static = require('koa-static')
const bodyParser = require('koa-bodyparser')
const { TezosToolkit } = require('@taquito/taquito')
const { InMemorySigner, importKey } = require('@taquito/signer')

const {
  PORT,
  INTERVAL,
  BASE_URL,
  FAUCET_KEY_PATH,
  TEZOS_WALLET_SECRET,
  CONTRACT_ADDRESS,
  RPC_URL
} = process.env

const HEX_STRING = /^[0-9a-fA-F]*$/

// Tezos client
const tezos = new TezosToolkit(RPC_URL)

// Publication contract
let contract

// Merkle tree
let tree = new MerkleTree
const pendingProofs = new Set

// RESTful API
const app = new Koa
app.use(static('static'))
app.use(bodyParser())
const router = new Router
router.post('/api/stamp', postStamp)
router.get('/api/proof/:id', getProof)
app.use(router.routes())
app.use(router.allowedMethods())
app.on('error', errorHandler)

// Setup
void async function () {

  // Configure tezos client
  if (FAUCET_KEY_PATH != null) {
    console.log('Importing testnet key')
    const json = await fs.readFile(FAUCET_KEY_PATH, 'utf-8')
    const faucet = JSON.parse(json)
    importKey(
      tezos,
      faucet.email,
      faucet.password,
      faucet.mnemonic.join(' '),
      faucet.secret
    )
  } else if (TEZOS_WALLET_SECRET != null) {
    console.log('Configuring local signer')
    const signer = await InMemorySigner.fromSecretKey(TEZOS_WALLET_SECRET)
    tezos.setProvider({ signer })
  } else {
    throw new Error('Must provide either FAUCET_KEY_PATH or TEZOS_WALLET_SECRET')
  }

  // Fetch contract
  console.log('Fetching publication contract')
  contract = await tezos.contract.at(CONTRACT_ADDRESS)

  // Create HTTP server
  app.listen(PORT, listenHandler)

  // Start publication interval
  setInterval(publishTree, INTERVAL * 1000)
}()

/**
 * POST /api/stamp route handler
 */
async function postStamp (ctx) {

  // Only allow JSON requests
  if (!ctx.is('json')) {
    ctx.throw(400, 'Reqest body must be JSON')
  }

  // Validate JSON
  const hashHex = ctx.request.body.hash
  if (hashHex == undefined) {
    ctx.throw(400, 'Request body must contain a hash field')
  }
  if (typeof hashHex != 'string' || !hashHex.match(HEX_STRING) || hashHex.length == 0) {
    ctx.throw(400, 'Hash field must be a hexidecimal string')
  }
  if (hashHex.length > 128) {
    ctx.throw(400, 'Hash cannot be larger than 64 bytes')
  }

  const hash = Hex.parse(hashHex)
  const proofId = Hex.stringify(blake2b(hash))

  // Aggregate hash for publication
  if (!pendingProofs.has(proofId)) {
    tree.append(hash)
    pendingProofs.add(proofId)
  }

  await pendingProof(ctx, proofId)
}

/**
 * GET /api/proof route handler
 */
async function getProof (ctx) {

  // Validate proof IDs
  const proofId = ctx.params.id
  if (!proofId.match(HEX_STRING)) {
    ctx.throw(400, `${proofId} is not a valid proof id`)
  }

  // Fetch proof
  if (pendingProofs.has(proofId)) {
    await pendingProof(ctx, proofId)
  } else {
    await fetchProof(ctx, proofId)
  }
}

/**
 * Respond that proof is pending
 */
async function pendingProof (ctx, proofId) {
  ctx.status = 202
  ctx.body = {
    status: 'Stamp pending',
    url: `${BASE_URL}/api/proof/${proofId}`
  }
}

/**
 * Respond with stored proof
 */
async function fetchProof (ctx, proofId) {
  try {
    const file = await fs.readFile(`proofs/${proofId}.json`, 'utf-8')
    ctx.body = file
  } catch (error) {
    if (error.code == 'ENOENT') {
      ctx.throw(404, 'Proof not found')
    } else {
      ctx.throw(500, 'Error fetching proof')
    }
  }
}

/**
 * Koa default error handler
 */
function errorHandler (err, ctx) {
  if (ctx.accepts('json')) {
    ctx.body = {
      error: err.message
    }
  } else {
    ctx.body = err.message
  }
}

/**
 * HTTP server ready handler
 */
function listenHandler () {
  console.log(`Serving on port ${PORT}`)
}

/**
 * Publish Merkle root to blockchain
 */
async function publishTree () {

  // Skip if aggregator is empty
  if (tree.size == 0) {
    console.log('Aggregator is empty. Skipping publication')
    return
  }

  // Create proofs directory
  await ensureDirectory('proofs')

  // Swap out live tree
  const pendingTree = tree
  tree = new MerkleTree

  // Invoke contract and await confirmation
  const payload = Hex.stringify(pendingTree.root)
  console.log(`Publishing aggregator root "${payload}" (${pendingTree.size} leaves)`)
  const operationGroup = await contract.methods.default(payload).send()
  const level = await operationGroup.confirmation(3)

  // Build and validate proof operations from aggregator root to block hash
  const block = await tezos.rpc.getBlock({ block: level - 2 }) // 2 blocks before 3rd confirmation
  const highSteps = await buildSteps(block.hash, operationGroup.hash)

  // Generate proofs
  console.log(`Saving proofs for root "${payload}" (${pendingTree.size} leaves)`)
  for (const path of pendingTree.paths()) {
    const lowSteps = walkOperations(path)
    const proof = new Proof(block.chain_id, lowSteps.concat(highSteps))
    const json = JSON.stringify(proof)
    const proofId = Hex.stringify(path.leaf)
    const filename = `proofs/${proofId}.json`
    try {
      await fs.stat(filename)
    } catch (error) {
      if (error.code == 'ENOENT') {
        await fs.writeFile(filename, json)
      } else {
        throw error
      }
    }
    pendingProofs.delete(proofId)
  }

  console.log(`Operation for root "${payload}" injected: https://tzkt.io/${operationGroup.hash}`)
}

/**
 * Ensure directory exists
 */
async function ensureDirectory (path) {
  try {
    await fs.mkdir(path)
  } catch (error) {
    if (error.code != 'EEXIST') {
      throw error
    }
  }
}

/**
 * Build proof steps from aggregator to block hash
 */
async function buildSteps (blockHash, opHash) {
  const steps = []
  const [ opHashes, rawHeader ] = await Promise.all([
    fetchOperationHashes(blockHash),
    fetchRawHeader(blockHash)
  ])

  // console.log(
  //   'DEBUG buildSteps:',
  //   `blockHash: ${blockHash}`,
  //   `opHash: ${opHash}`
  // )

  // Aggregator root to 4th-pass operation list hash
  steps.push(...await tracePass(blockHash, opHashes, 3, opHash))

  // 4rd-pass operation list hash to root operations hash
  const pass12hash = blake2b(concat(
    blake2b(passHash(opHashes[0])),
    blake2b(passHash(opHashes[1]))
  ))
  const pass3hash = blake2b(passHash(opHashes[2]))
  steps.push(
    Operation.prepend(pass3hash),
    Operation.prepend(pass12hash)
  )

  // Operations hash to block hash
  const pass34hash = blake2b(concat(
    pass3hash,
    blake2b(passHash(opHashes[3]))
  ))
  const passesHash = blake2b(concat(
    pass12hash,
    pass34hash
  ))
  steps.push(
    ...encasingOperations(rawHeader, passesHash),
    Operation.blake2b()
  )

  return steps
}

/**
 * Calculate the hash of a validation pass
 */
function passHash (list) {
  if (list.length == 0) {
    return blake2b(new Uint8Array)
  }
  const tree = new MerkleTree
  for (const hash of list) {
    const raw = Base58.decodeCheck(hash).slice(2)
    tree.append(raw)
  }
  return tree.root
}

/**
 * Trace a path through a validation pass
 */
async function tracePass (blockHash, operationsList, pass, targetHash) {
  const tree = new MerkleTree
  const steps = []
  let leaf = -1
  for (const index in operationsList[pass]) {
    const hash = operationsList[pass][index]
    const rawHash = Base58.decodeCheck(hash).slice(2)
    tree.append(rawHash)
    if (hash == targetHash) {
      leaf = index
      const rawOp = await fetchRawOperation(blockHash, pass, index)
      steps.push(
        ...encasingOperations(rawOp, rawHash),
        Operation.blake2b()
      )
    }
  }
  if (leaf == -1) {
    throw new Error('Target operation not found in pass')
  }
  const paths = tree.paths()
  for (let i = 0; i < leaf; ++i) {
    paths.next()
  }
  steps.push(...walkOperations(paths.next().value))
  return steps
}

/**
 * Fetch operation hashes list from Tezos RPC
 */
async function fetchOperationHashes (blockHash) {
  const url = new URL(`chains/main/blocks/${blockHash}/operation_hashes`, RPC_URL)
  const response = await fetch(url)
  return await response.json()
}

/**
 * Fetch Micheline-encoded operation group from Tezos RPC
 */
async function fetchRawOperation (blockHash, pass, index) {
  const url = new URL(`chains/main/blocks/${blockHash}/operations/${pass}/${index}`, RPC_URL)
  const response = await fetch(url, {
    headers: { 'Accept': 'application/octet-stream' }
  })
  return new Uint8Array(await response.arrayBuffer())
}

/**
 * Fetch Micheline-encoded block header from Tezos RPC
 */
async function fetchRawHeader (blockHash) {
  const url = new URL(`chains/main/blocks/${blockHash}/header`, RPC_URL)
  const response = await fetch(url, {
    headers: { 'Accept': 'application/octet-stream' }
  })
  return new Uint8Array(await response.arrayBuffer())
}

/**
 * Map a Merkle tree walk to proof operations
 */
function walkOperations (path) {
  const ops = [ Operation.blake2b() ]
  for (const [ relation, sibling ] of path.steps) {
    ops.push(
      relation
        ? Operation.append(sibling)
        : Operation.prepend(sibling),
      Operation.blake2b()
    )
  }
  return ops
}

/**
 * Create a prepend-append operation pair representing a sub array encased in a larger bytes array
 */
function encasingOperations (raw, sub) {
  const hexRaw = Hex.stringify(raw)
  const hexSub = Hex.stringify(sub)
  if (!hexRaw.includes(hexSub)) {
    throw new Error('Sub byte array is not included in raw byte array')
  }
  const [ pre, post ] = hexRaw.split(RegExp(hexSub + '(.*)')) // Split string at first occurence only
  return [
    Operation.prepend(Hex.parse(pre)),
    Operation.append(Hex.parse(post))
  ]
}
