#!/usr/bin/env node

var parseArgs = require('minimist')

var argv = parseArgs(
    process.argv,
    opts={
        "default": {
            "node":"https://mainnet-tezos.giganode.io/",
            "indexer":"https://api.better-call.dev/v1",
            "network":"mainnet",
        },

        "alias": {
            "secret-path":"secret_path"
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

var Tezos = new TezosToolkit(`${argv.node}`);

if (argv.secret_path) {
    SECRET = fs.readFileSync(argv.secret_path)
}
else if (TEZOS_WALLET_SECRET) {
    SECRET = TEZOS_WALLET_SECRET
}
else {
    SECRET = false
}

async function keySetup () {
    // Setup MainNet Key
    Tezos.setProvider({signer: await InMemorySigner.fromSecretKey(`${SECRET}`)})
    return Tezos
}

if (argv.faucet) { // TestNet Key
    FAUCET_KEY = JSON.parse(fs.readFileSync(argv.faucet))
    importKey(
        Tezos,
        FAUCET_KEY.email,
        FAUCET_KEY.password,
        FAUCET_KEY.mnemonic.join(' '),
        FAUCET_KEY.secret
    )
}

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

async function readContract(contractName) {
    var contracts = fs.readdirSync("contracts")
    var contractTz = fs.readFileSync(
        "contracts/" +
            contracts[contracts.indexOf(`${contractName}` + ".tz")],
        {"encoding":"utf8"}
    )
    const p = new Parser()
    var contract = p.parseScript(contractTz)
    return contract
}

async function deploy (contractName) {
    const contract = await readContract(contractName)
    Tezos.contract.originate({
        code: contract,
        init: "Unit",
        })
        .then(originationOp => {
            console.log(`Waiting for confirmation of origination for ${originationOp.contractAddress}...`);
            return originationOp.contract()
        })
        .then (contract => {
            console.log(`Origination completed. Use a chainviewer like https://better-call.dev/ to confirm the KT1 is ready.`);
        }).catch(error => console.log(error));
}

async function upload (kt1, uploadHash) {
    try {
        const contract = await Tezos.contract.at(kt1)
        const operation = await contract.methods.default(uploadHash).send()
        await operation.confirmation(3)
        console.log(`Operation injected: https://better-call.dev/${argv.network}/opg/${operation.hash}/contents`)
    } catch (error) {
        console.error(`Error: ${error.message}`)
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

async function viewStorage(network, kt1) {
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
        })
    .then(res => res.text())
    .then(body => JSON.parse(body))
}

async function estimate (contractName, kt1) {
    /* Estimate cost of:
       - Originating contracts
       - Uploading hash to a contract
    */
    var contract = await Tezos.contract.at(kt1)
    const fakeUploadHash = Hex.stringify(crypto.randomBytes(64))
    const truncatedKt1 = kt1.slice(0,6) + "..." + kt1.slice(30)
    const operation = await Tezos.estimate.transfer(
        contract.methods.default(fakeUploadHash).toTransferParams({})
    )
    const baseCost = operation.totalCost / 1000000
    console.log(`Upload a merkle root to ${truncatedKt1}: ${baseCost.toPrecision(5)}ꜩ`)
    console.log(`Upload daily root to ${truncatedKt1} for a month: ${(baseCost * 30).toPrecision(5)}ꜩ`)
    console.log(`Upload daily root to ${truncatedKt1} for a year: ${(baseCost * 365).toPrecision(5)}ꜩ`)
    console.log(`Upload to ${truncatedKt1} on fastest schedule for a month: ${(baseCost * 60 * 24 * 30).toPrecision(5)}ꜩ`)
    console.log(`Upload to ${truncatedKt1} on fastest schedule for a year: ${(baseCost * 60 * 24 * 365).toPrecision(5)}ꜩ`)
    var contract = await readContract(contractName)
    try {
        const originationOp = await Tezos.estimate.originate({
            code: contract,
            init: "{}",
        })
        console.log(`Originate ${contractName} contract: ${originationOp.totalCost / 1000000}ꜩ`)
    } catch (error) {
        console.error(error.message)
    }
}

async function view () {
    switch (argv._[3]) {
        case 'stats':
            var stats = await viewStats(argv.network, argv._[4])
            console.log(`Users: ${stats.users}\n` +
                        `Transactions: ${stats.txs}\n` +
                        `Volume: ${stats.volume}`)
            break;
        case 'storage':
            var contents = await viewStorage(argv.network, argv._[4])
            contents.forEach(
                function (i) {
                    var key = i.data["key"]["value"]
                    var value = i.data["value"]["value"]
                    console.log(`${key}:${value}\n`)
                }
            )
            break;
        default:
            console.log(`Unrecognized stats view: "${argv._[3]}"`)
    }
}

async function run () {
    if (!argv.faucet && SECRET) {
        Tezos = await keySetup()
    }
    switch (argv._[2]) {
        case 'is-tzstamp':
            if (argv._[3].length != 36) {
                throw `"${argv._[3]}" doesn't seem to be a kt1 address (wrong length)`
            }
            console.log(await isTzStamp(`${argv._[3]}`))
            break;
        case 'deploy':
            await deploy(argv._[3])
            break;
        case 'upload-hash':
            await upload(argv._[3], argv._[4])
            break;
        case 'estimate':
            await estimate(argv._[3], argv._[4])
            break;
        case 'view':
            await view()
            break;
        default:
            console.log(`Unrecognized subcommand: "${argv._[2]}"`)
    }
}

run()
