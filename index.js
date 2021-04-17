#!/usr/bin/env node

const fs = require('fs/promises')
require('dotenv-defaults').config()
const {
  MerkleTree,
  _util: {
    parse,
    hash: sha256,
    compare,
    stringify
  }
} = require('@tzstamp/merkle')
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

// Merkle tree
let tree = new MerkleTree
let pendingTree = tree // eslint-disable-line

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
    const signer = await InMemorySigner.fromSecretKey(TEZOS_WALLET_SECRET)
    tezos.setProvider({ signer })
  } else {
    throw new Error('Must provide either FAUCET_KEY_PATH or TEZOS_WALLET_SECRET')
  }

  // Create HTTP server
  app.listen(PORT, listenHandler)

  // Start publication interval
  setInterval(stampTree, INTERVAL * 1000)
}()

/**
 * POST /api/stamp route handler
 */
function postStamp (ctx) {

  // Only allow JSON requests
  if (!ctx.is('json')) {
    ctx.throw(400, 'Reqest body must be JSON')
  }

  // Validate JSON
  const hash = ctx.request.body.hash
  if (hash == undefined) {
    ctx.throw(400, 'Request body must contain a hash field')
  }
  if (typeof hash != 'string' || !hash.match(HEX_STRING)) {
    ctx.throw(400, 'Hash field must be a hexidecimal string')
  }

  // Queue to publish
  const digest = parse(hash)
  tree.append(sha256(digest))
  const proofId = stringify(sha256(digest))
  ctx.body = {
    status: 'Stamp pending',
    url: `${BASE_URL}/api/proof/${proofId}`
  }
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
  const digest = parse(proofId)
  if (tree.leaves.find(leaf => compare(leaf, digest))) {
    ctx.status = 202
    ctx.body = { status: 'Stamp pending' }
  } else {
    const proofPath = `proofs/${proofId}.json`
    try {
      const json = await fs.readFile(proofPath, 'utf-8')
      ctx.body = JSON.parse(json)
    } catch (error) {
      if (error.code == 'ENOENT') {
        ctx.throw(404, 'Proof not found')
      } else {
        ctx.throw(500, 'Error fetching proof')
      }
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

async function stampTree () {
  // Publish the current merkle root and inclusion proofs
  if (tree.hash == null) {
    return
  }
  try {
    await fs.mkdir('proofs')
  } catch (error) {
    if (error.code != 'EEXIST') {
      throw error
    }
  }
  const root = tree.hash
  // Shallow copy leaves to avoid them changing during proof generation
  const staticLeaves = tree.leaves.slice(0)
  let operation = null
  try {
    const contract = await tezos.contract.at(CONTRACT_ADDRESS)
    operation = await contract.methods.default(stringify(root)).send()
  } catch (error) {
    console.error(`Error: ${error.message}`)
  }
  // Generate proof files for tree in memory
  for (const leaf of staticLeaves) {
    // Strip custom .toJSON()...
    let proof = JSON.parse(JSON.stringify(tree.prove(leaf)))
    proof['operation'] = operation.hash
    proof = JSON.stringify(proof)
    const filename = `proofs/${stringify(leaf)}.json`
    try {
      await fs.stat(filename)
    } catch (error) {
      if (error == 'ENOENT') {
        await fs.writeFile(filename)
      } else {
        throw error
      }
    }
  }
  // Drop leaves before confirmation to prevent repeat commits during await
  tree = new MerkleTree
  try {
    await operation.confirmation(3)
    console.log(`Operation injected: https://delphi.tzstats.com/${operation.hash}`)
  } catch (error) {
    console.error(`Error: ${error.message}`)
  }
}
