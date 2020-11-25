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

let tree = new MerkleTree

express()
  .use(express.json())
  .use(express.static('static'))
  .post('/api/stamp', postStamp)
  .get('/api/proof/:id', getProof)
  .use(errorHandler)
  .listen(PORT, listenHandler)

setInterval(notarizeTree, INTERVAL)

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
  // TODO
}
