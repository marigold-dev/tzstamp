# TzStamp Server

tzstamp is a [cryptographic timestamping service](https://www.gwern.net/Timestamping)
that uses the Tezos blockchain to prove a file existed at or before a certain time.

**tzstamp-server** is the software implementing the tzstamp service. Files are
hashed using the SHA-256 or blake2b algorithm and then submitted to the server.
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

For more information on using tzstamp-server [see its manual page](https://github.com/marigold-dev/tzstamp/blob/main/server/man/man1/tzstamp-server.md).

## Setup TestNet TzStamp On Debian 10.6

Assuming a fresh install you'll need to `apt-get` some dependencies:

    sudo apt-get install git nodejs npm

The global nodejs installation will have to be upgraded from Debian 10's default
before you can run TzStamp:

    sudo npm --global --upgrade install npm

    sudo npm --global --upgrade install node

Before you can deploy a contract, you'll need to [download a faucet
key](https://faucet.tzalpha.net/) for the Tezos testnet. Make sure to remember
where you store this key as we'll use it in the following steps.

Next clone the tzstamp contract management utility.

    git clone https://github.com/marigold-dev/tzstamp
    cd tzstamp/manage

Install the dependencies for the management utility.

    npm install

Deploy the 'noop' contract.

    ./index.js deploy noop --faucet tz1abAjdogmGma8EuSDE8xNbwfEtGAKMSrd4.json --node https://testnet-tezos.giganode.io

[Use a chainviewer](https://better-call.dev/) to verify you've originated the
contract. Write down the KT1, you'll use it in the server configuration.

Clone the tzstamp server software.

    git clone https://github.com/marigold-dev/tzstamp
    cd tzstamp/server

Install the tzstamp server dependencies.

    npm install

Create a `.env` config file in the project root. Here is an
example setup:

    PORT=80
    BASE_URL=https://tzstamp.example.com/ # Base URL for the API
    SECRET=edpk... # Tezos wallet secret
    CONTRACT_ADDRESS=KT1AtaeG5PhuFyyivbfPZRUBkVMiqyxpo2cH # On mainnet
    SCHEDULE="0 0 * * *" # Publish at midnight every day

Used variables are as follows:
- `PROOFS_DIR`: Directory to store proofs in. Defaults to `"proofs"`. Can be an absolute or relative path.
- `PORT`: API server port to listen on. Defaults to `"8000"`.
- `BASE_URL`: Base URL for the API. Used in responses containing a dynamic endpoint. Does not need to match the server port if, for example, a reverse proxy is being used. Defaults to `"http://localhost:8000"`
- `KEY_FILE`: Path to JSON key file.
- `SECRET`: Bare secret key. Takes precedence over `KEY_KEY`.
- `CONTRACT_ADDRESS`: "KT1..." smart contract address. Defaults to `"KT1AtaeG5PhuFyyivbfPZRUBkVMiqyxpo2cH"`.
- `RPC_URL`: Tezos node RPC base URL. Defaults to `"https://mainnet.tezos.marigold.dev"`. Any public or private accessible Tezos RPC may be used.
- `SCHEDULE`: 5- or 6-field [cron expression](https://docs.oracle.com/cd/E12058_01/doc/doc.1014/e12030/cron_expressions.htm). Defaults to `"0 0 * * *"`, which is daily at midnight, local to the server.

One of `SECRET` or `KEY_FILE` must be set.

Run the server.

    npm start

## Setup TestNet TzStamp On MacOS

See Debian 10.6 instructions, [but use homebrew](https://brew.sh/) to install nodejs instead.

    brew install node
