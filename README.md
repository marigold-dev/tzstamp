tzstamp is a [cryptographic timestamp server](https://www.gwern.net/Timestamping)
that uses the Tezos blockchain to prove a set of bytes (file) existed on or
before a certain time.

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

    ./index.js deploy expensive --faucet tz1abAjdogmGma8EuSDE8xNbwfEtGAKMSrd4.json --node https://testnet-tezos.giganode.io

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
