var parseArgs = require('minimist')

var argv = parseArgs(
    process.argv,
    opts={"default":
          {
              "node":"https://mainnet-tezos.giganode.io/",
              "indexer":"https://api.better-call.dev/v1",
              "network":"delphinet",
          }
         }
)

require('dotenv-defaults').config()

const { PORT, INTERVAL } = process.env

const fs = require('fs')

const fetch = require('node-fetch')

const crypto = require('crypto')

const { TezosToolkit } = require('@taquito/taquito')

const { InMemorySigner } = require('@taquito/signer')

const  { importKey } = require('@taquito/signer')

const { Parser } = require('@taquito/michel-codec')

const Tezos = new TezosToolkit(`${argv.node}`);

if (argv.secret) { // MainNet Key
    async function keySetup () {
        Tezos.setProvider({signer: await InMemorySigner.fromSecretKey(`${argv.secret}`)})
    }
}
else if (argv.faucet) { // TestNet Key
    FAUCET_KEY = JSON.parse(fs.readFileSync(argv.faucet))
    importKey(
        Tezos,
        FAUCET_KEY.email,
        FAUCET_KEY.password,
        FAUCET_KEY.mnemonic.join(' '),
        FAUCET_KEY.secret
    )
}

/* Feature List */
/*

1. Manually upload hash to contract instance.
Approach: Taquito with remote signer(?)

2. Diagnostics
Approach: Taquito and GigaNode as default

*/

var TZSTAMP_VERSIONS = new Set()
TZSTAMP_VERSIONS.add(
    "7009d7d3c79963f5128ba90d7f548eb82d4ec3d7f23ac919329234882e0d8ce3"
)

async function getContractHash (addr) {
    const contract = await Tezos.contract.at(addr);
    const storage = await contract.storage();
    const code = contract.script.code;
    return crypto.createHash("sha256")
        .update(JSON.stringify(code))
        .digest("hex")
}

async function isTzStamp (addr) {
    return TZSTAMP_VERSIONS.has(await getContractHash(addr))
}

async function deploy (contractName) {
    var contracts = fs.readdirSync("contracts")
    var contract_tz = fs.readFileSync(
        "contracts/" +
            contracts[contracts.indexOf(`${contractName}` + ".tz")],
        {"encoding":"utf8"}
    )
    const p = new Parser()
    var contract = p.parseScript(contract_tz)
    Tezos.contract.originate({
        code: contract,
        init: "{}",
        })
        .then(originationOp => {
            console.log(`Waiting for confirmation of origination for ${originationOp.contractAddress}...`);
            return originationOp.contract()
        })
        .then (contract => {
            console.log(`Origination completed. Use a chainviewer like https://better-call.dev/ to confirm the KT1 is ready.`);
        }).catch(error => console.log(`Error: ${JSON.stringify(error, null, 2)}`));
}

async function viewStats (network, kt1) {
    return await fetch(
        argv.indexer +
            `/stats/${network}/contracts?contracts=${kt1}&period=all`
    )
    .then(res => res.text())
    .then(body => body = JSON.parse(body))
}

async function view () {
    if (argv._[3] === "stats") {
        var stats = await viewStats(argv.network, argv._[4])
        console.log(`Users: ${stats.users}\n` +
                    `Transactions: ${stats.txs}\n` +
                    `Volume: ${stats.volume}`)
    }
}

async function run () {
    switch (argv._[2]) {
        case 'is_tzstamp':
            if (argv._[3].length != 36) {
                throw `"${argv._[3]}" doesn't seem to be a kt1 address (wrong length)`
            }
            console.log(await isTzStamp(`${argv._[3]}`))
            break;
        case 'deploy':
            await deploy(argv._[3])
            break;
        case 'view':
            await view()
            break;
        default:
            console.log(`Unrecognized subcommand: "${argv._[2]}"`)
    }
}

run()
