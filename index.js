const fs = require('fs');
require('dotenv-defaults').config()
const {
  MerkleTree,
  _util: {
    parse,
    hash,
    compare
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

/*
// 2020-12-03: Expect one method, bytes(), which takes a sha256; i.e. addHash()
const tzstampContract = tezos.contract
    .at(config.TZSTAMP_CONTRACT_ADDR)
    .then(c => {
        let methods = c.parameterSchema.ExtractSignatures();
    })
    .catch(error => console.log(`Error: ${error}`));
*/

let tree = new MerkleTree

express()
  .use(express.json())
  .use(express.static('static'))
  .post('/api/stamp', postStamp)
  .get('/api/proof/:id', getProof)
  .use(errorHandler)
  .listen(PORT, listenHandler)

// TODO: Set this to use config.CERTIFY_TREE_N_DAYS
setInterval(notarizeTree, (1 * 60 * 1000))

function postStamp (req, res) {
  if (!req.is('json'))
    throw SyntaxError('Request type is not JSON')
  if (req.body.hash == undefined)
    throw SyntaxError('Request body does not contain a hash field')
  const digest = parse(req.body.hash)
  tree.append(hash(digest))
  res
    .status(202)
    .json({ status: 'Notarization pending'})
}

function getProof (req, res) {
  const digest = parse(req.params.id)
  // TODO
  if (tree.leaves.find(leaf => compare(leaf, digest)))
    res
      .status(202)
      .json({ status: 'Notarization pending'})
  else throw new ReferenceError('Hash not found')
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

function notarizeTree () {
    tezos.contract
        .at(config.TZSTAMP_CONTRACT_ADDR)
        .then(c => {
            return c.methods.default("84714a61037b3b4fa539008681cbfa97c7256930279ff4b54bad7366521afc67").send()
        })
        .then(op => {
            console.log(op)
            return op.confirmation(3).then(() => op.hash);
        })
        .then(hash => console.log(`Operation injected: https://delphi.tzstats.com/${hash}`))
        .catch(error => console.log(`Error: ${error.message}`));
}
