const Help = require('./help')
const chalk = require('chalk')
const { getHash, getProof, getNode } = require('./helpers')
const { compare } = require('@tzstamp/helpers')
const { PendingProof, AffixedProof, VerifyStatus } = require('@tzstamp/proof')

async function handler (options) {
  // Early exits
  if (options._ == undefined || options._.length < 2) {
    return Help.handler({ _: [ 'verify' ] })
  }

  // Get the hash and proof
  const [ target, proofLocation ] = options._
  const hash = await getHash(target, options.verbose)
  let proof = await getProof(proofLocation, options.verbose)
  if (!compare(hash, proof.hash)) {
    throw new Error('Proof is unrelated to the file hash')
  }
  if (proof instanceof PendingProof) {
    if (options.verbose) {
      console.log('Resolving partial proof')
    }
    proof = await proof.resolve()
  }
  if (!(proof instanceof AffixedProof)) {
    throw new Error('Proof is incomplete or damaged')
  }

  // Warn if not affixed to Mainnet
  if (!proof.mainnet) {
    console.log('\n' + chalk.red.bold`Warning`)
    console.log(`The proof is affixed to the alternative Tezos network "${proof.network}"`)
    console.log('It might not be trustworthy!\n')
  }

  // Verify proof
  const node = options.node || getNode(proof.network)
  try {
    if (options.verbose) {
      console.log(chalk.dim`Querying node ${node} for the header of block ${proof.blockHash}\n`)
    }
    const status = await proof.verify(node)
    if (status != VerifyStatus.Verified) {
      console.log(chalk.red.bold`Could not verify proof`)
      switch (status) {
        case VerifyStatus.NetError:
          console.log('A network error occurred')
          break
        case VerifyStatus.NotFound:
          console.log('The block hash asserted by the proof was not found')
          console.log(`Asserted block hash: ${proof.blockHash}`)
          console.log(`Node queried: ${getNode()}`)
          break
        case VerifyStatus.Mismatch:
          console.log('The proof timestamp does not match on-chain timestamp')
          break
      }
      process.exit(1)
    }
    console.log(chalk.green.bold`Verified`)
    console.log(`Target: ${target}`)
    console.log(`Hash existed at ${proof.timestamp.toLocaleString()}`)
    console.log(`Block hash: ${proof.blockHash}`)
    console.log(`Node queried: ${getNode()}`)
    console.log()
  } catch (error) {
    throw new Error(`Could not verify proof: ${error.message}`)
  }
}

const parseOptions = {
  string: [
    'node'
  ],
  alias: {
    node: 'n'
  }
}

module.exports = {
  handler,
  parseOptions,
  title: 'Verify',
  description: 'Verifies that a file or hash existed at the time asserted by a proof.',
  usage: 'tzstamp verify <file|hash> <proofFile|URL>',
  remarks: [
    'Will print out a warning if the proof is affixed to an alternative network.'
  ],
  options: [
    [ '--node, -n', 'Sets a custom Tezos node server' ]
  ],
  examples: [
    'tzstamp verify myFile.txt myFile.proof.json',
    'tzstamp verify --node https://rpc.example.com/ myFile.txt https://example.com/myProof.json',
    'tzstamp verify  rawHashProof.json'
  ]
}
