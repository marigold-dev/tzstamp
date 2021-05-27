<img src="https://tzstamp.io/workmark-small.png" width="300px" />

## About

tzstamp is a [cryptographic timestamping service](https://www.gwern.net/Timestamping)
that uses the Tezos blockchain to prove a file existed at or before a certain time.

**tzstamp-server** is the software implementing the tzstamp service. Files are
hashed using the SHA-256 algorithm and then the hash is submitted to the server.
TzStamp aggregates the hashes in a merkle tree structure, or a tree of hashes.
The root of that tree is published to a smart contract on the Tezos blockchain,
allowing many hashes to be shown to have existed at a certain time on-chain for
the cost of one. A further benefit of the merkle tree structure is that users
can prove their hash was included in the merkle root without relying on tzstamp
to store their submitted hash long term. Once the root is published, users download an
inclusion proof consisting of the nodes necessary to derive a merkle root given
the submitted hash. Because nodes are stored as a binary tree, the number of
nodes necessary to derive the root grows logarithmically to the tree size,
ensuring that the proof stays small even as the server begins to handle millions
or billions of entries.

See https://www.gwern.net/Timestamping for more background information on
trusted timestamping services.

## Setup TestNet TzStamp On Debian 10.6

Assuming a fresh install you'll need to `apt-get` some dependencies:

    sudo apt-get install git nodejs npm

Before you can deploy a contract, you'll need to [download a faucet
key](https://faucet.tzalpha.net/) for the Tezos testnet. Make sure to remember
where you store this key as we'll use it in the following steps.

Next clone the tzstamp contract management utility.

    git clone https://gitlab.com/tzstamp/manage
    cd manage

Install the dependencies for the management utility.

    npm install

Deploy either the 'simple' contract (node indexers store merkle roots) or the
'expensive' contract (hashes stored on chain).

    ./index.js deploy simple --faucet tz1abAjdogmGma8EuSDE8xNbwfEtGAKMSrd4.json --node https://testnet-tezos.giganode.io

[Use a chainviewer](https://better-call.dev/) to verify you've originated the
contract. Write down the KT1, you'll use it in the server configuration.

Clone the tzstamp server software.

    git clone https://gitlab.com/tzstamp/server
    cd server

Install the tzstamp server dependencies.

    npm install

Edit the file `.env.defaults` with your contract KT1 in `CONTRACT_ADDRESS` and
the path to your faucet key in `FAUCET_KEY_PATH`. Be sure to set your `INTERVAL`
between publishing merkle roots to the desired value.

    emacs .env.defaults

Run the server.

    ./index.js

## Setup TestNet TzStamp On MacOS

See Debian 10.6 instructions, [but use homebrew](https://brew.sh/) to install nodejs instead.

    brew install node
