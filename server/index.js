#!/usr/bin/env node

require('dotenv').config()
const { ProofStorage } = require('./lib/storage')
const { Aggregator } = require('./lib/aggregator')
const {
  stampHandler,
  proofHandler,
  statusHandler,
  configureAPI
} = require('./lib/api')
const { configureTezosClient } = require('./lib/tezos')
const { CronJob } = require('cron')

const {
  PROOFS_DIR: proofsDirectory = 'proofs',
  PORT: port = '8000',
  BASE_URL: baseURL = 'http://localhost:8000',
  KEY_FILE: keyFile,
  SECRET: secret,
  CONTRACT_ADDRESS: contractAddress = 'KT1AtaeG5PhuFyyivbfPZRUBkVMiqyxpo2cH',
  RPC_URL: rpcURL = 'https://mainnet.tezos.marigold.dev',
  SCHEDULE: schedule = '*/5 * * * *'
} = process.env

/**
 * Server setup
 */
void async function () {
  const storage = new ProofStorage(proofsDirectory)
  const tezosClient = await configureTezosClient(secret, keyFile, rpcURL)
  const contract = await tezosClient.contract.at(contractAddress)
  const aggregator = new Aggregator(storage, tezosClient.rpc, contract)
  const job = new CronJob(schedule, () => aggregator.publish())
  const network = await tezosClient.rpc.getChainId()
  const app = await configureAPI(
    stampHandler(baseURL, aggregator, schedule),
    proofHandler(baseURL, storage, aggregator),
    statusHandler(network, contractAddress, schedule)
  )
  app.listen(port, () => {
    console.log(`Listening on port ${port}`)
  })
  job.start()
}()
