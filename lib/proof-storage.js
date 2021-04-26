const fs = require('fs/promises')

// Storage directory
const PROOFS_DIRECTORY = 'proofs'

/**
 * Determine proof filepath
 *
 * @param {*} proofId Proof identifier
 * @returns {string} Proof filepath
 */
function filepath (proofId) {
  return `${PROOFS_DIRECTORY}/${proofId}.json`
}

/**
 * Ensure proofs directory exists
 */
async function ensureProofsDir () {
  try {
    await fs.mkdir(PROOFS_DIRECTORY)
  } catch (error) {
    if (error.code != 'EEXIST') {
      throw error
    }
  }
}

/**
 * Respond that proof is pending
 */
async function pendingProof (ctx, baseURL, proofId) {
  const acceptedType = ctx.accepts('text/plain', 'application/json')
  const url = `${baseURL}/proof/${proofId}`
  ctx.status = 202
  switch (acceptedType) {
    case 'text/plain':
      ctx.type = 'text/plain'
      ctx.body = url + '\n'
      break
    case 'application/json':
      ctx.type = 'aplication/json'
      ctx.body = { url }
      break
    default:
      ctx.throw(406, 'Unable to negotation content type of response')
  }
}

/**
 * Respond with stored proof
 *
 * @param ctx Koa context
 * @param {string} proofId Proof identifier
 */
async function fetchProof (ctx, proofId) {
  try {
    ctx.body = await fs.readFile(filepath(proofId))
  } catch (error) {
    ctx.assert(error.code == 'ENOENT', 500, 'Error fetching proof')
    ctx.throw(404, 'Proof not found')
  }
}

/**
 * Store proof in flat file
 *
 * @param {Proof} proof Proof abstraction
 * @param {string} proofId Proof identifier
 */
async function storeProof (proof, proofId) {
  try {
    await fs.stat(filepath(proofId))
  } catch (error) {
    if (error.code == 'ENOENT') {
      await fs.writeFile(
        filepath(proofId),
        JSON.stringify(proof)
      )
    } else {
      throw error
    }
  }
}

module.exports = {
  ensureProofsDir,
  pendingProof,
  fetchProof,
  storeProof
}
