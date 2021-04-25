#!/usr/bin/env node

const fs = require('fs/promises')
require('dotenv-defaults').config()
const { MerkleTree } = require('@tzstamp/tezos-merkle')
const { Hex, blake2b } = require('@tzstamp/helpers')
const { Proof } = require('@tzstamp/proof')
const Koa = require('koa')
const Router = require('@koa/router')
const bodyParser = require('koa-bodyparser')
const { TezosToolkit } = require('@taquito/taquito')
const { InMemorySigner, importKey } = require('@taquito/signer')
const { ensureProofsDir, pendingProof, fetchProof, storeProof } = require('./lib/proof-storage')
const { walkOperations, buildSteps } = require('./lib/tezos-merkle')

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
app.use(bodyParser())
const router = new Router
router.post('/stamp', postStamp)
router.get('/proof/:id', getProof)
app.use(router.routes())
app.use(router.allowedMethods())
app.on('error', errorHandler)

// Setup
void async function () {

  // Configure tezos client
  if (TEZOS_WALLET_SECRET != null) {
    console.log('Configuring local signer')
    const signer = await InMemorySigner.fromSecretKey(TEZOS_WALLET_SECRET)
    tezos.setProvider({ signer })
  } else if (FAUCET_KEY_PATH != null) {
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
  } else {
    throw new Error('Must provide either FAUCET_KEY_PATH or TEZOS_WALLET_SECRET')
  }

  // Fetch contract
  console.log('Fetching publication contract')
  contract = await tezos.contract.at(CONTRACT_ADDRESS)

  await ensureProofsDir()

  // Create HTTP server
  app.listen(PORT, listenHandler)

  // Start publication interval
  setInterval(publishTree, INTERVAL * 1000)
}()

/**
 * POST /stamp route handler
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

  await pendingProof(ctx, BASE_URL, proofId)
}

/**
 * GET /proof route handler
 */
async function getProof (ctx) {

  // Validate proof IDs
  const proofId = ctx.params.id
  if (!proofId.match(HEX_STRING)) {
    ctx.throw(400, `${proofId} is not a valid proof id`)
  }

  // Fetch proof
  if (pendingProofs.has(proofId)) {
    await pendingProof(ctx, BASE_URL, proofId)
  } else {
    await fetchProof(ctx, proofId)
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
  if (block.protocol != 'PtEdo2ZkT9oKpimTah6x2embF25oss54njMuPzkJTEi5RqfdZFA') {
    throw new Error(`Unsupported block protocol "${block.header.protocol}"`)
  }
  const highSteps = buildSteps(block, operationGroup.hash)
  const highProof = new Proof(block.chain_id, highSteps)
  if (highProof.derive(pendingTree.root).address != block.hash) {
    throw new Error('Could not validate steps from aggregator to block')
  }

  // Generate proofs
  console.log(`Saving proofs for root "${payload}" (${pendingTree.size} leaves)`)
  for (const path of pendingTree.paths()) {
    const lowSteps = walkOperations(path)
    const proof = new Proof(block.chain_id, lowSteps.concat(highSteps))
    const proofId = Hex.stringify(path.leaf)
    storeProof(proof, proofId)
    pendingProofs.delete(proofId)
  }

  console.log(`Operation for root "${payload}" injected: https://tzkt.io/${operationGroup.hash}`)
}
