const fs = require('fs/promises')
const { randomBytes } = require('crypto')
const { Hex } = require('@tzstamp/helpers')
const { Proof, FetchError, UnresolvedProof, Blake2bOperation, InvalidTemplateError } = require('@tzstamp/proof')
const chalk = require('chalk')
const fetch = require('node-fetch')
const delay = require('delay')
const Help = require('./help')
const { getHash, getSafeNames } = require('./helpers')

async function longPollProof (proof) {
  async function resolve () {
    try {
      return await proof.resolve()
    } catch (error) {
      if (error instanceof InvalidTemplateError) {
        return
      }
      if (!(error instanceof FetchError)) {
        throw new Error(`Error while waiting for publication: ${error.message}`)
      }
      switch (error.status) {
        case 202:
          return
        default:
          throw new Error(`Bad server response while waiting for publication: ${error.status}`)
      }
    }
  }

  // Check immediately
  const newProof = await resolve()
  if (newProof) {
    return newProof
  }

  // Check every 30 seconds after
  for (;;) {
    await delay(30000)
    const newProof = await resolve()
    if (newProof) {
      return newProof
    }
  }
}

async function handler (options) {
  // Early exits
  if (options._ == undefined || !options._.length) {
    return Help.handler({ _: [ 'stamp' ] })
  }

  const targets = options._
  const servers = options.servers
    ? options.servers.split(',')
    : [ 'https://api.tzstamp.io/' ]
  const allProofs = []

  // Submit each target file/hash to each aggregator server
  for (const target of targets) {
    const proofs = []
    const paths = await getSafeNames(target, options.directory, options.verbose)

    // Create base proof
    const baseProof = new Proof({
      hash: await getHash(target, options.verbose),
      operations: options.nonce
        ? [ new Blake2bOperation(32, new Uint8Array(randomBytes(32))) ]
        : []
    })
    if (!options.nonce && options.verbose) {
      console.log(chalk.dim`--no-nonce: Submitting raw hashes`)
    }

    // Submit hash to each aggregator server
    submit: for (const server of servers) {
      // POST hash to server
      let response
      const endpoint = new URL('stamp', server)
      if (options.verbose) {
        console.log(chalk.dim`Submitting ${Hex.stringify(baseProof.derivation)} to <${server}> for aggregation`)
      }
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'application/json'
          },
          body: JSON.stringify({
            data: Hex.stringify(baseProof.derivation)
          })
        })
      } catch (error) {
        console.error(`Could not reach aggregator <${server}>: ${error.message}`)
        continue submit
      }
      if (!response.ok) {
        console.error(`Could not submit hash to aggregator <${server}>: ${response.status} ${response.statusText}`)
        continue submit
      }

      // Extract proof URL from response
      if (options.verbose) {
        console.log(chalk.dim`Parsing response from <${server}>`)
      }
      try {
        const { url: proofURL } = await response.json()
        if (options.verbose) {
          console.log(chalk.dim`Successfully submitted hash to <${server}>`)
        }
        const remoteProof = new UnresolvedProof({
          hash: baseProof.derivation,
          operations: [],
          remote: proofURL
        })
        proofs.push(baseProof.concat(remoteProof))
      } catch (error) {
        console.error(`Could not parse response from aggregator <${server}>`)
        continue submit
      }
    }

    // Save proofs
    for (const proof of proofs) {
      allProofs.push({
        target,
        proof,
        proofPath: paths.next().value
      })
    }
  }

  // Store proofs
  for (const { target, proofPath, proof } of allProofs) {
    let finalProof

    // Wait for publication
    if (options.wait) {
      if (options.verbose) {
        console.log(chalk.dim`Waiting for publication`)
      }
      for (const { proof } of allProofs) {
        finalProof = await longPollProof(proof)
        if (options.verbose) {
          console.log(chalk.dim`Proof at <${proof.remote}> published`)
        }
      }
    } else {
      finalProof = proof
    }

    // Serialize and write to filesystem
    if (options.verbose) {
      console.log(chalk.dim`Writing proof to ${proofPath}`)
    }
    await fs.writeFile(proofPath, JSON.stringify(finalProof))
    console.log(`Stored proof for ${target} at ${proofPath}.`)
  }
}

const parseOptions = {
  boolean: [
    'wait',
    'nonce'
  ],
  string: [
    'servers',
    'directory'
  ],
  alias: {
    wait: 'w',
    directory: 'd',
    servers: 's'
  },
  default: {
    nonce: true
  }
}

module.exports = {
  handler,
  parseOptions,
  title: 'Stamp',
  description: 'Creates a timestamp proof.',
  usage: 'tzstamp stamp [options] <file|hash> [...<file|hash>]',
  remarks: [
    'Raw file hashes must be between 32 and 64 bytes.',
    'Default aggregator server is <https://api.tzstamp.io/>.'
  ],
  options: [
    [ '--wait, -w', 'Waits until all proofs are published before continuing execution.' ],
    [ '--servers, -s', 'Comma-separated list of aggregator servers.' ],
    [ '--directory, -d', 'Sets proof output directory.' ],
    [ '--nonce', 'Nonces the file hash hash(es) before submitting to the aggregator(s). True by default' ]
  ],
  examples: [
    'tzstamp stamp -s https://api.example.com/ myFile.txt',
    'tzstamp stamp --wait myFile.txt',
    'tzstamp stamp 4a5be57589b4ddc42d87e4df775161e5bbcdf772058093d524b04dd88533a50a',
    'tzstamp stamp --directory /tmp file1.txt file2.txt file3.txt'
  ]
}
