const fsSync = require('fs')
const fs = require('fs/promises')
const { Proof } = require('@tzstamp/proof')

/**
 * Proof storage
 */
class ProofStorage {

  /**
   * @param {string} directory Proof directory path
   */
  constructor (directory) {
    this.directory = directory
    fsSync.mkdirSync(directory, { recursive: true })
  }

  /**
   * Gets the storage path for a given proof identifier.
   *
   * @param {string} proofId Proof identifier
   */
  path (proofId) {
    return `${this.directory}/${proofId}.proof.json`
  }

  /**
   * Reads a proof from storage.
   *
   * @param {string} proofId Proof identifier
   */
  async getProof (proofId) {
    const contents = await fs.readFile(
      this.path(proofId)
    )
    const template = JSON.parse(contents)
    return Proof.from(template)
  }

  /**
   * Serializes and writes a proof to storage.
   *
   * @param {Proof} proof Proof instance
   * @param {string} proofId Proof identifier
   */
  async storeProof (proof, proofId) {
    try {
      await fs.stat(this.path(proofId))
    } catch (error) {
      if (error.code == 'ENOENT') {
        await fs.writeFile(
          this.path(proofId),
          JSON.stringify(proof)
        )
      } else {
        throw error
      }
    }
  }
}

module.exports = {
  ProofStorage
}
