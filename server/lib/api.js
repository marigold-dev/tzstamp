const Koa = require('koa')
const Router = require('@koa/router')
const bodyParser = require('koa-bodyparser')
const { Hex, Blake2b } = require('@tzstamp/helpers')
const { timeout } = require('cron')
const cors = require('@koa/cors');

/**
 * @typedef {import('./storage').ProofStorage} ProofStorage
 * @typedef {import('./aggregator').Aggregator} Aggregator
 */

/**
 * Configures the RESTful API
 *
 * @param {Koa.Middleware} stampHandler
 * @param {Koa.Middleware} proofHandler
 * @param {Koa.Middleware} statusHandler
 */
exports.configureAPI = async function (stampHandler, proofHandler, statusHandler) {
  const router = new Router()
    .post('/stamp', stampHandler)
    .get('/proof/:id', proofHandler)
    .get('/status', statusHandler)
  const app = new Koa()
    .use(cors())
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
 * @param {string} schedule
 * @returns {Koa.Middleware}
 */
exports.stampHandler = function (baseURL, aggregator, schedule) {
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
    const secondsToPublication = (timeout(schedule) / 1000).toFixed(0)
    switch (acceptedType) {
      default:
      case 'text/plain':
        ctx.type = 'text/plain'
        ctx.body = `${url}\nTime to publication (seconds): ${secondsToPublication}\n`
        break
      case 'application/json':
        ctx.type = 'application/json'
        ctx.body = {
          url,
          secondsToPublication
        }
    }
  }
}

/**
 * Generates a handler for GET requests to the "/proof" endpoint.
 *
 * @param {string} baseURL
 * @param {ProofStorage} storage
 * @param {Aggregator} aggregator
 * @returns {Koa.Middleware}
 */
exports.proofHandler = function (baseURL, storage, aggregator) {
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
 * @param {string} network
 * @param {string} contractAddress
 * @param {string} schedule
 * @returns {Koa.Middleware}
 */
exports.statusHandler = function (network, contractAddress, schedule) {
  return (ctx) => {
    const acceptedType = ctx.accepts('text/plain', 'application/json')
    const secondsToPublication = (timeout(schedule) / 1000).toFixed(0)
    switch (acceptedType) {
      default:
      case 'text/plain':
        ctx.body = 'Proof Version: 1\n'
        ctx.body += `Network: ${network}\n`
        ctx.body += `Contract: ${contractAddress}\n`
        ctx.body += `Time to publication (seconds): ${secondsToPublication}\n`
        break
      case 'application/json':
        ctx.body = {
          proofVersion: 1,
          network,
          contract: contractAddress,
          secondsToPublication
        }
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
