const { Hex } = require('@tzstamp/helpers')
const { Blake2bOperation, Sha256Operation, JoinOperation, PendingProof, AffixedProof } = require('@tzstamp/proof')
const chalk = require('chalk')
const Help = require('./help')
const { getProof } = require('./helpers')

async function handler (options) {
  // Early exits
  if (options._ == undefined || !options._.length) {
    return Help.handler({ _: [ 'manual-verify' ] })
  }

  const proofLocation = options._[0]
  let proof = await getProof(proofLocation, options.verbose)
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

  // Print manual verification instructions
  let step = 1
  console.log(chalk.bold`Manual verification instructions`)
  console.log(`${step++}. Begin with hash ${Hex.stringify(proof.hash)}`)
  console.log(`Asserted block hash: ${proof.blockHash}`)
  console.log(`proof operations length ${proof.operations.length}`)
  for (const operation of proof.operations) {
    if (operation instanceof Sha256Operation) {
      console.log(`${step++}. Take the SHA-256 hash.`)
    } else if (operation instanceof Blake2bOperation) {
      console.log(
        `${step++}. Take the BLAKE2b ${operation.key ? 'keyed ' : ' '}hash (${operation.length}-byte digest).`
      )
      if (operation.key) {
        console.log(`Key is 0x${Hex.stringify(operation.key)}`)
      }
    } else if (operation instanceof JoinOperation) {
      if (!operation.prepend && !operation.append) {
        continue
      }
      if (operation.prepend) {
        console.log(`${step++}. Prepend the bytes 0x${Hex.stringify(operation.prepend)}.`)
      }
      if (operation.append) {
        console.log(`${step++}. Append the bytes 0x${Hex.stringify(operation.append)}.`)
      }
    }
  }
  console.log(`${step++}. Prepend the bytes 0x0134.`)
  console.log(`${step++}. Base-58 encode with a checksum, as per Bitcoin's implementation.`)
  if (proof.mainnet) {
    console.log(`${step++}. Visit a trusted mainnet indexer.`)
  } else {
    console.log(`${step++}. Visit an indexer for network "${proof.network}".`)
  }
  console.log(`${step++}. Search for the Base-58 encoded block hash.`)
  console.log(`${step++}. Confirm that the timestamp recorded is ${proof.timestamp.toLocaleString()}.`)
  console.log()
}

module.exports = {
  handler,
  title: 'Manual Verify',
  description: 'Prints manual proof verification instructions.',
  usage: 'tzstamp manual-verify <proofFile|URL>',
  examples: [
    'tzstamp manual-verify myFile.proof.json',
    'tzstamp manual-verify https://example.com/myProof.json'
  ]
}
