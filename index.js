var parseArgs = require('minimist')

var argv = parseArgs(
    process.argv,
    opts={"default":{"node":"https://mainnet-tezos.giganode.io/"}}
)

console.log(argv)

require('dotenv-defaults').config()

const { PORT, INTERVAL } = process.env

const fs = require('fs')

const crypto = require('crypto')

const { TezosToolkit } = require('@taquito/taquito')

const { InMemorySigner } = require('@taquito/signer')

const  { importKey } = require('@taquito/signer')

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

1. Determine whether given address is tzstamp contract.
Approach: Compare hash of contract michelson to premade list. Contracts
shouldn't change often so this is viable.

2. Manually upload hash to contract instance.
Approach: Taquito with remote signer(?)

3. Deploy TzStamp
Approach: IBID. Store predefined list of TzStamp contract types(?)

4. Diagnostics
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



if (argv._[2] === "is_tzstamp") {
    if (argv._[3].length != 36) {
        throw `"${argv._[3]}" doesn't seem to be a kt1 address (wrong length)`
    }
    async function i () {
        console.log(await isTzStamp(`${argv._[3]}`))
    }
    i()
}
