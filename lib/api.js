const Koa = require('koa')
const Router = require('@koa/router')
const bodyParser = require('koa-bodyparser')
const { Hex, Blake2b } = require('@tzstamp/helpers')
const { timeout } = require('cron')

/**
 * @typedef {import('./aggregator').Aggregator} Aggregator
 * @typedef {import('./storage').ProofStorage} ProofStorage
 * @typedef {import('@taquito/taquito').TezosToolkit} TezosToolkit
 * @typedef {import('./publisher').Publisher} Publisher
 * @typedef {import('cron').CronJob} CronJob
 */

/**
 * Configures the RESTful API
 *
 * @param {string} baseURL
 * @param {ProofStorage} storage
 * @param {Aggregator} aggregator
 * @param {Publisher} publisher
 * @param {CronJob} cronJob
 */
exports.configureAPI = async function (baseURL, storage, aggregator, tezosClient, publisher, cronJob) {
  const router = new Router()
    .post('/stamp', await stampHandler(baseURL, aggregator))
    .get('/proof/:id', await proofHandler(baseURL, storage, aggregator))
    .get('/status', await statusHandler(tezosClient, publisher, cronJob))
  const app = new Koa()
    .use(errorHandler)
    .use(bodyParser())
    .use(router.routes())
    .use(router.allowedMethods({ throw: true }))
  return app
}

/**
 * Generates a handler for POST requests to the "/stamp" endpoint.
 *
 * @param {string} baseURL
 * @param {Aggregator} aggregator
 * @returns {Promise<(ctx: Koa.Context) => void>}
 */
async function stampHandler (baseURL, aggregator) {
  return (ctx) => {

    // Validate input
    const hashHex = ctx.request.body.data
    ctx.assert(hashHex != undefined, 400, 'Data field is missing')
    ctx.assert(typeof hashHex == 'string', 400, 'Data field is wrong type')
    ctx.assert(hashHex.length, 400, 'Data field is empty')
    ctx.assert(Hex.validator.test(hashHex), 400, 'Data field is not a hexadecimal string')
    ctx.assert(hashHex.length <= 128, 400, 'Data field is larger than 64 bytes')

    const hash = Hex.parse(hashHex)
    const proofId = Hex.stringify(
      Blake2b.digest(hash)
    )

    // Aggregate hash for publication
    if (!aggregator.pendingProofs.has(proofId)) {
      aggregator.merkleTree.append(hash)
      aggregator.pendingProofs.add(proofId)
    }

    // Respond that the proof is pending
    const acceptedType = ctx.accepts('text/plain', 'application/json')
    const url = new URL(`/proof/${proofId}`, baseURL)
    ctx.status = 202
    switch (acceptedType) {
      case 'text/plain':
        ctx.type = 'text/plain'
        ctx.body = `${url}\n`
        break
      case 'application/json':
        ctx.type = 'application/json'
        ctx.body = { url }
        break
      default:
        ctx.throw(406, 'Unable to negotiate content type of response')
    }
  }
}

/**
 * Generates a handler for GET requests to the "/proof" endpoint.
 *
 * @param {string} baseURL
 * @param {ProofStorage} storage
 * @param {Aggregator} aggregator
 * @returns {Promise<(ctx: Koa.Context) => Promise<void>>}
 */
async function proofHandler (baseURL, storage, aggregator) {
  return async (ctx) => {
    const proofId = ctx.params.id
    ctx.assert(Hex.validator.test(proofId), 400, 'Invalid proof ID')

    if (aggregator.pendingProofs.has(proofId)) {
      // Respond that proof is pending
      const acceptedType = ctx.accepts('text/plain', 'application/json')
      const url = new URL(`/proof/${proofId}`, baseURL)
      ctx.status = 202
      switch (acceptedType) {
        default:
        case 'text/plain':
          ctx.type = 'text/plain'
          ctx.body = 'Pending\n'
          break
        case 'application/json':
          ctx.type = 'application/json'
          ctx.body = {
            url,
            status: 'Pending'
          }
      }
    } else {
      // Respond with proof from storage
      try {
        const proof = await storage.getProof(proofId)
        ctx.body = proof.toJSON()
      } catch (error) {
        ctx.assert(error.code == 'ENOENT', 500, 'Error fetching proof')
        ctx.throw(404, 'Proof not found')
      }
    }
  }
}

/**
 * Generates a handler for GET requests to the "/status" endpoint.
 *
 * @param {TezosToolkit} tezosClient
 * @param {Publisher} publisher
 * @param {CronJob} cronJob
 * @returns {Promise<(ctx: Koa.Context) => Promise<void>>}
 */
async function statusHandler (tezosClient, publisher, cronJob) {
  return async (ctx) => {
    ctx.body = {
      network: await tezosClient.rpc.getChainId(),
      contract: publisher.contract.address,
      timeout: timeout(cronJob.cronTime.source),
      active: Boolean(cronJob.running)
    }
  }
}

/**
 * Handles errors throw by downstream middleware
 */
async function errorHandler (ctx, next) {
  try {
    await next()
    if (ctx.status == 404) {
      ctx.throw(404, 'Not found')
    }
  } catch (error) {
    const acceptedType = ctx.accepts('text/plain', 'application/json')
    ctx.status = error.status || 500
    switch (acceptedType) {
      default:
      case 'text/plain':
        ctx.body = error.message + '\n'
        break
      case 'application/json':
        ctx.body = { error: error.message }
        break
    }
  }
}
