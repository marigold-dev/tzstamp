#!/usr/bin/env node

require('dotenv').config()
const { ProofStorage } = require('./lib/storage')
const { Aggregator } = require('./lib/aggregator')
const { configureAPI } = require('./lib/api')
const { configureTezosClient } = require('./lib/tezos')
const { Publisher } = require('./lib/publisher')
const { CronJob } = require('cron')

const {
  PROOFS_DIR: proofsDirectory = 'proofs',
  PORT: port = '8000',
  BASE_URL: baseURL = 'http://localhost:8000',
  KEY_FILE: keyFile,
  SECRET: secret,
  CONTRACT_ADDRESS: contractAddress = 'KT1NU6erpSTBphHi9fJ9SxuT2a6eTouoWSLj',
  RPC_URL: rpcURL = 'https://mainnet-tezos.giganode.io/',
  SCHEDULE: schedule = '0 0 * * *'
} = process.env

/**
 * Server setup
 */
void async function () {
  const storage = new ProofStorage(proofsDirectory)
  const aggregator = new Aggregator()
  const tezosClient = await configureTezosClient(secret, keyFile, rpcURL)
  const publisher = new Publisher(storage, aggregator, tezosClient)
  await publisher.bind(contractAddress)
  const job = new CronJob(schedule, () => publisher.publish())
  const app = await configureAPI(baseURL, storage, aggregator)
  app.listen(port, () => {
    console.log(`Serving on port ${port}`)
  })
  job.start()
}()
