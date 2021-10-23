## About

**tzstamp-manage** is a helper utility for managing and deploying instances of
the tzstamp smart contract. This is especially useful for users who need to
manage instances at scale, such as those working with multiple private chains.
Access to a wallet is required to make use of deployment and manual uploading
of merkle roots.

For more information on using tzstamp-manage [see its manual page](man/man1/tzstamp-manage.md).

## Install on Debian 10.6

Assuming a fresh install you'll need to `apt-get` some dependencies:

    sudo apt-get install git nodejs npm

The global nodejs installation will have to be upgraded from Debian 10's default
before you can run TzStamp:

    sudo npm --global --upgrade install npm

    sudo npm --global --upgrade install node

Next clone the tzstamp contract management utility.

    git clone https://gitlab.com/tzstamp/manage
    cd manage

Install the dependencies for the management utility.

    npm install

Before you can deploy a contract or upload a Merkle root, you'll need to
[download a faucet key](https://faucet.tzalpha.net/) for the Tezos testnet.

You're now ready to use the utility.

## Basic Use

### Deploying a smart contract

TzStamp has a variety of possible backend smart contracts. However upgrades in
the TzStamp proof protocol currently mean there's no upside to using any
available contract besides 'noop', which accepts the bytes of a hash
without storing it. TzStamp's proof protocol lets it avoid having to store the
Merkle root on chain. Instead the TzStamp server constructs a long lived proof
by showing the hash of this operation must be part of its parent block.

Once [you have the faucet key](https://faucet.tzalpha.net/) you can deploy the 'noop' contract by running:

    ./index.js deploy noop --faucet tz1abAjdogmGma8EuSDE8xNbwfEtGAKMSrd4.json --node https://testnet-tezos.giganode.io

[Use a chainviewer](https://better-call.dev/) to verify you've originated the
contract.

### Manually upload a Merkle root

In rare cases it may be desirable to manually push a Merkle root to the
contract. For example if TzStamp crashes with a WIP tree that an administrator
would like to upload in its current state. You can do that with the following
commands:

#### On TestNet

    tzstamp-manage upload-hash KT1AkQkRdLgE9NKSTCaPPZPgQuX7NUEtXzdj 84714a61037b3b4fa539008681cbfa97c7256930279ff4b54bad7366521afc67 --node https://testnet-tezos.giganode.io/ --faucet tz1MKs91KPzkpmZYz7Dvbd9dyq86murA1BrN.json

#### On MainNet

    tzstamp-manage upload-hash KT1K5npkpWK6wxkcBg97dZD77c2J7DmWvxSb a4e9de2410c9e7c3ac4c57bbc18beedc5935d5c8118e345a72baee00a9820b67 --secret-path secret.txt

### Viewing Contract Storage

    tzstamp-manage view storage KT1AkQkRdLgE9NKSTCaPPZPgQuX7NUEtXzdj --node https://testnet-tezos.giganode.io/

### Checking If A Contract Is A TzStamp Instance

**Note**: The stored hashes are currently out of date, do not rely on this to
determine if a contract is a TzStamp contract or not.

    tzstamp-manage is-tzstamp KT1AkQkRdLgE9NKSTCaPPZPgQuX7NUEtXzdj --node https://testnet-tezos.giganode.io/
