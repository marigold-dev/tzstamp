const { Hex } = require('@tzstamp/helpers')
const Help = require('./help')
const { getProof } = require('./helpers')

function format (format, bytes) {
  const hex = Hex.stringify(bytes)
  switch (format) {
    case 'decimal':
    case 'dec':
      return BigInt('0x' + hex).toString()
    case 'binary':
    case 'bin':
      return BigInt('0x' + hex).toString(2)
    case 'hexadecimal':
    case 'hex':
    default:
      return hex
  }
}

async function handler (options) {
  // Early exits
  if (options._ == undefined || options._.length < 1) {
    return Help.handler({ _: [ 'derive' ] })
  }

  // Print formatted derivation
  const proofLocation = options._[0]
  const proof = await getProof(proofLocation)
  console.log(
    format(
      options.format,
      proof.derivation
    )
  )
}

const parseOptions = {
  string: [
    'format'
  ],
  alias: {
    format: 'f'
  }
}

module.exports = {
  handler,
  parseOptions,
  title: 'Derive',
  description: 'Print a formatted derivation of a proof to be used in shell scripts.',
  usage: 'tzstamp derive <proofFile|URL>',
  remarks: [
    'Default output is hexadecimal.'
  ],
  options: [
    [ '--format, -f', 'Sets output format. Values are bin(ary), dec(imal), and hex(adecimal).' ]
  ],
  examples: [
    'tzstamp derive --format bin myFile.txt.proof.json',
    'tzstamp derive https://example.com/myProof.json'
  ]
}
