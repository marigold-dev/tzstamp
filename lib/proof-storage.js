const fs = require('fs/promises')
const { Proof } = require("@tzstamp/proof")

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
  ctx.status = 202
  ctx.body = {
    status: 'Stamp pending',
    url: `${baseURL}/api/proof/${proofId}`
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
    if (error.code == 'ENOENT') {
      ctx.throw(404, 'Proof not found')
    } else {
      ctx.throw(500, 'Error fetching proof')
    }
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
