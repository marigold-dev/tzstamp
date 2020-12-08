const fs = require('fs');
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

const { PORT, INTERVAL } = process.env

const config = JSON.parse(fs.readFileSync("config.json"))

const { TezosToolkit } = require('@taquito/taquito')

const { InMemorySigner } = require('@taquito/signer')

const  { importKey } = require('@taquito/signer')

const tezos = new TezosToolkit(config.TZNODE_RPC_URL);

// TODO: Implement remote signer(?) branch
if (config.FAUCET_KEY) {
    importKey(
        tezos,
        config.FAUCET_KEY.email,
        config.FAUCET_KEY.password,
        config.FAUCET_KEY.mnemonic.join(' '),
        config.FAUCET_KEY.secret
    );
}

let tree = new MerkleTree

express()
  .use(express.json())
  .use(express.static('static'))
  .post('/api/stamp', postStamp)
  .get('/api/proof/:id', getProof)
  .use(errorHandler)
  .listen(PORT, listenHandler)

// TODO: Set this to use config.CERTIFY_TREE_N_DAYS
setInterval(stampTree, (1 * 60 * 1000))

function postStamp (req, res) {
    if (!req.is('json'))
        throw SyntaxError('Request type is not JSON')
    if (req.body.hash == undefined) {
        throw SyntaxError('Request body does not contain a hash field')
    }
    else if (typeof(req.body.hash) == typeof({})) {
        throw SyntaxError("Request body's hash field was empty.")
    }
    else if (!req.body.hash.match(/^[0-9a-fA-F]{64}$/)) {
        throw SyntaxError(`${req.body.hash} is not a sha256 hash!`)
    }
  const digest = parse(req.body.hash)
  tree.append(hash(digest))
  proof_id = stringify(hash(digest))
  res
    .status(202)
    .json({ status: 'Stamp pending', url: `/api/proof/${proof_id}`})
}

function getProof (req, res) {
  if (!req.params.id.match(/^[0-9a-fA-F]{64}$/)) {
      throw SyntaxError(`${req.params.id} is not a sha256 hash!`)
  }
  const digest = parse(req.params.id)
  if (tree.leaves.find(leaf => compare(leaf, digest)))
    res
      .status(202)
      .json({ status: 'Stamp pending'})
  else if (fs.existsSync("proofs/" + req.params.id + ".json"))
      {
          proof = JSON.parse(fs.readFileSync("proofs/" + req.params.id + ".json"))
          res
          .status(200)
          .json(proof)
      }
  else throw new ReferenceError('Not found. Your proof is no longer in cache or unsubmitted.')
}

function errorHandler (err, req, res, next) {
  switch (err.constructor.name) {
    case 'SyntaxError':
      res.status(400)
      break
    case 'ReferenceError':
      res.status(404)
      break
    default:
      res.status(500)
  }
  res.json({ error: err.message })
}

function listenHandler () {
  console.log(`Serving on port ${PORT}`)
}

function stampTree () {
    if (tree.hash == null) {
        return null;
    }
    if (!fs.existsSync("proofs")) {
        fs.mkdirSync("proofs")
    }
    // Generate proof files for tree in memory
    for (const leaf of tree.leaves) {
        proof = JSON.stringify(tree.prove(leaf))
        filename = stringify(leaf)
        if (!fs.existsSync(`proofs/${filename}.json`)) {
            fs.writeFileSync(`proofs/${filename}.json`, proof)
        }
    }
    tezos.contract
        .at(config.TZSTAMP_CONTRACT_ADDR)
        .then(c => {
            return c.methods.default(tree.hash).send()
        })
        .then(op => {
            return op.confirmation(3).then(() => op.hash);
        })
        .then(hash => console.log(`Operation injected: https://delphi.tzstats.com/${hash}`))
        .catch(error => console.log(`Error: ${error.message}`));
    tree = new MerkleTree
}
