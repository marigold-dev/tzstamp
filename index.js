#!/usr/bin/env node

const fs = require('fs')
require('dotenv-defaults').config()
const {
  MerkleTree,
  _util: {
    parse,
    hash,
    compare,
    stringify
  }
} = require('@tzstamp/merkle')
const express = require('express')
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

const key = getKey()

// Configure taquito
const tezos = new TezosToolkit(RPC_URL)
if (key.secret) {
  importKey(
    tezos,
    key.email,
    key.password,
    key.mnemonic.join(' '),
    key.secret
  )
}

let tree = new MerkleTree

async function run () {
  if (!key.secret) {
    const signer = await InMemorySigner.fromSecretKey(key)
    tezos.setProvider({ signer })
  }
  express()
    .use(express.json())
    .use(express.static('static'))
    .post('/api/stamp', postStamp)
    .get('/api/proof/:id', getProof)
    .use(errorHandler)
    .listen(PORT, listenHandler)
  setInterval(stampTree, INTERVAL * 1000)
}

function getKey () {
  if (FAUCET_KEY_PATH != null) {
    const text = fs.readFileSync(FAUCET_KEY_PATH)
    return JSON.parse(text)
  }
  if (TEZOS_WALLET_SECRET != null) {
    return TEZOS_WALLET_SECRET
  }
  throw new Error("Must provide either FAUCET_KEY_PATH or TEZOS_WALLET_SECRET")
}

function postStamp (req, res) {
  if (!req.is('json')) {
    throw new SyntaxError('Request type is not JSON')
  }
  if (req.body.hash == undefined) {
    throw new SyntaxError('Request body does not contain a hash field')
  } else if (typeof req.body.hash == 'object') {
    throw new SyntaxError('Request body\'s hash field was empty.')
  } else if (!req.body.hash.match(/^[0-9a-fA-F]{64}$/)) {
    throw new SyntaxError(`${req.body.hash} is not a sha256 hash!`)
  }
  const digest = parse(req.body.hash)
  tree.append(hash(digest))
  const proofId = stringify(hash(digest))
  res
    .status(202)
    .json({
      status: 'Stamp pending',
      url: `${BASE_URL}/api/proof/${proofId}`
    })
}

function getProof (req, res) {
  if (!req.params.id.match(/^[0-9a-fA-F]{64}$/)) {
    throw new SyntaxError(`${req.params.id} is not a sha256 hash!`)
  }
  const digest = parse(req.params.id)
  if (tree.leaves.find(leaf => compare(leaf, digest))) {
    res
      .status(202)
      .json({ status: 'Stamp pending'})
  } else {
    const proofPath = `proofs/${req.params.id}.json`
    if (fs.existsSync(proofPath)) {
      const proof = JSON.parse(fs.readFileSync(proofPath))
      res.status(200).json(proof)
    } else {
      throw new ReferenceError('Not found. Your proof is no longer in cache or unsubmitted.')
    }
  }
}

// eslint-disable-next-line no-unused-vars
function errorHandler (err, req, res, next) {
  if (err instanceof SyntaxError) {
    res.status(400)
  } else if (err instanceof ReferenceError) {
    res.status(404)
  } else {
    res.status(500)
  }
  res.json({ error: err.message })
}

function listenHandler () {
  console.log(`Serving on port ${PORT}`)
}

async function stampTree () {
  // Publish the current merkle root and inclusion proofs
  if (tree.hash == null) {
    return
  }
  if (!fs.existsSync('proofs')) {
    fs.mkdirSync('proofs')
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
    proof["operation"] = operation.hash
    proof = JSON.stringify(proof)
    const filename = `proofs/${stringify(leaf)}.json`
    if (!fs.existsSync(filename)) {
      fs.writeFileSync(filename, proof)
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

run()
