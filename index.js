#!/usr/bin/env node

const parseArgs = require('minimist')

const argv = parseArgs(
  process.argv,
  {
    'default': {
      'node': 'https://mainnet-tezos.giganode.io/',
      'indexer': 'https://api.better-call.dev/v1',
      'network': 'mainnet'
    },

    'alias': {
      'secret-path': 'secret_path'
    }
  }
)

require('dotenv-defaults').config()

const { TEZOS_WALLET_SECRET } = process.env

const fs = require('fs')

const fetch = require('node-fetch')

const crypto = require('crypto')

const { Hex } = require('@tzstamp/helpers')

const { TezosToolkit } = require('@taquito/taquito')

const { InMemorySigner } = require('@taquito/signer')

const  { importKey } = require('@taquito/signer')

const { Parser } = require('@taquito/michel-codec')

let Tezos = new TezosToolkit(`${argv.node}`)

const SECRET = (() => {
  if (argv.secret_path) {
    return fs.readFileSync(argv.secret_path)
  } else if (TEZOS_WALLET_SECRET) {
    return TEZOS_WALLET_SECRET
  } else {
    return false
  }
})()

async function keySetup () {
  // Setup MainNet Key
  Tezos.setProvider({signer: await InMemorySigner.fromSecretKey(`${SECRET}`)})
  return Tezos
}

if (argv.faucet) { // TestNet Key
  const FAUCET_KEY = JSON.parse(fs.readFileSync(argv.faucet))
  importKey(
    Tezos,
    FAUCET_KEY.email,
    FAUCET_KEY.password,
    FAUCET_KEY.mnemonic.join(' '),
    FAUCET_KEY.secret
  )
}

let TZSTAMP_VERSIONS = new Set()
TZSTAMP_VERSIONS.add(
  '7009d7d3c79963f5128ba90d7f548eb82d4ec3d7f23ac919329234882e0d8ce3'
)

async function getContractHash (addr) {
  const contract = await Tezos.contract.at(addr)
  const code = contract.script.code
  return crypto.createHash('sha256')
    .update(JSON.stringify(code))
    .digest('hex')
}

async function isTzStamp (addr) {
  return TZSTAMP_VERSIONS.has(await getContractHash(addr))
}

async function readContract (contractName) {
  let contracts = fs.readdirSync('contracts')
  let contractTz = fs.readFileSync(
    'contracts/' +
    contracts[contracts.indexOf(`${contractName}` + '.tz')],
    {'encoding': 'utf8'}
  )
  const p = new Parser()
  let contract = p.parseScript(contractTz)
  return contract
}

async function deploy (contractName) {
  const contract = await readContract(contractName)
  Tezos.contract.originate({
    code: contract,
    init: '{}'
  })
    .then(originationOp => {
      console.log(`Waiting for confirmation of origination for ${originationOp.contractAddress}...`)
      return originationOp.contract()
    }) // eslint-disable-next-line no-unused-vars
    .then(contract => {
      console.log('Origination completed. Use a chainviewer like https://better-call.dev/ to confirm the KT1 is ready.')
    }).catch(error => console.log(`Error: ${JSON.stringify(error, null, 2)}`))
}

async function upload (kt1, uploadHash) {
  try {
    const contract = await Tezos.contract.at(kt1)
    const operation = await contract.methods.default(uploadHash).send()
    await operation.confirmation(3)
    console.log(`Operation injected: https://better-call.dev/${argv.network}/opg/${operation.hash}/contents`)
  } catch (error) {
    console.error(`Error: ${error}`)
  }
}

async function viewStats (network, kt1) {
  return await fetch(
    argv.indexer +
    `/stats/${network}/contracts?contracts=${kt1}&period=all`
  )
    .then(res => res.text())
    .then(body => body = JSON.parse(body))
}

async function viewStorage (network, kt1) {
  return await fetch(
    argv.indexer +
    `/contract/${network}/${kt1}/storage/raw`
  )
    .then(res => res.text())
    .then(body => body = JSON.parse(body))
    .then(
      async function (bigMapID) {
        return await fetch(
          argv.indexer +
          `/bigmap/${network}/${bigMapID}/keys`
        )
      }
    )
    .then(res => res.text())
    .then(body => JSON.parse(body))
}

async function estimate (contractName, kt1) {
  /* Estimate cost of:
       - Originating contracts
       - Uploading hash to a contract
  */
  let contract = await Tezos.contract.at(kt1)
  const fakeUploadHash = Hex.stringify(crypto.randomBytes(64))
  const truncatedKt1 = kt1.slice(0, 6) + '...' + kt1.slice(30)
  const operation = await Tezos.estimate.transfer(
    contract.methods.default(fakeUploadHash).toTransferParams({})
  )
  const baseCost = operation.totalCost / 1000000
  console.log(`Upload a merkle root to ${truncatedKt1}: ${baseCost.toPrecision(5)}ꜩ`)
  console.log(`Upload daily root to ${truncatedKt1} for a month: ${(baseCost * 30).toPrecision(5)}ꜩ`)
  console.log(`Upload daily root to ${truncatedKt1} for a year: ${(baseCost * 365).toPrecision(5)}ꜩ`)
  console.log(`Upload to ${truncatedKt1} on fastest schedule for a month: ${(baseCost * 60 * 24 * 30).toPrecision(5)}ꜩ`)
  console.log(`Upload to ${truncatedKt1} on fastest schedule for a year: ${(baseCost * 60 * 24 * 365).toPrecision(5)}ꜩ`)
  contract = await readContract(contractName)
  try {
    const originationOp = await Tezos.estimate.originate({
      code: contract,
      init: '{}'
    })
    console.log(`Originate ${contractName} contract: ${originationOp.totalCost / 1000000}ꜩ`)
  } catch (error) {
    console.error(error.message)
  }
}

async function view () {
  switch (argv._[3]) {
    case 'stats': {
      let stats = await viewStats(argv.network, argv._[4])
      console.log(`Users: ${stats.users}\n` +
                  `Transactions: ${stats.txs}\n` +
                  `Volume: ${stats.volume}`)
    }
      break
    case 'storage': {
      let contents = await viewStorage(argv.network, argv._[4])
      contents.forEach(
        function (i) {
          let key = i.data['key']['value']
          let value = i.data['value']['value']
          console.log(`${key}:${value}\n`)
        }
      )
    }
      break
    default:
      console.log(`Unrecognized stats view: '${argv._[3]}'`)
  }
}

async function run () {
  if (!argv.faucet && SECRET) {
    Tezos = await keySetup()
  }
  const subcommand = argv._[2]
  switch (subcommand) {
    case 'is-tzstamp':
      if (argv._[3].length != 36) {
        throw `'${argv._[3]}' doesn't seem to be a kt1 address (wrong length)`
      }
      console.log(await isTzStamp(`${argv._[3]}`))
      break
    case 'deploy': {
      const contractName = argv._[3]
      await deploy(contractName)
    }
      break
    case 'upload-hash': {
      if (argv._[3].length != 36) {
        throw `'${argv._[3]}' doesn't seem to be a kt1 address (wrong length)`
      }
      const kt1 = argv._[3]
      const uploadHash = argv._[4]
      await upload(kt1, uploadHash)
    }
      break
    case 'estimate': {
      const contractName = argv._[3]
      const kt1 = argv._[4]
      await estimate(contractName, kt1)
    }
      break
    case 'view':
      await view()
      break
    default:
      console.log(`Unrecognized subcommand: '${argv._[2]}'`)
  }
}

run()
