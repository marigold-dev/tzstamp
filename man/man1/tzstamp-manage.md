% TZSTAMP-MANAGE(1)
% John David Pressman, Benjamin Herman
% January 2021

# NAME

tzstamp-manage - Manage an instance of the tzstamp Tezos smart contract

# SYNOPSIS

**tzstamp-manage** **deploy** *CONTRACT_NAME*

**tzstamp-manage** **upload-hash** *CONTRACT_KT1* *HASH*

**tzstamp-manage** **view** {**stats** | **storage**} *CONTRACT_KT1*

**tzstamp-manage** **is-tzstamp** *CONTRACT_KT1*

# DESCRIPTION

**tzstamp-manage** is a helper utility for managing instances of the tzstamp
smart contract. This is especially useful for users who need to manage instances
at scale, such as those working with multiple private chains. Access to a wallet
is required to make use of deployment and manual uploading of merkle roots.

# OPTIONS

**\-\-node**
: Tezos node RPC URL to publish kt1 transactions with. For private chains this should be a custom node instance that publishes to the chain.

**\-\-indexer**
: Chainviewer instance to view the network with. There is currently no standard for Tezos chainviewer API's, so the assumption is made that you are connecting to an instance of the (open source) Better Call Dev indexer: https://api.better-call.dev/v1/docs/index.html

**\-\-network**
: The name of the network to publish transactions to. (e.g. delphinet)

**\-\-secret\-path**
: Filepath to an (unencrypted) tezos secret key. You can also export the environment variable TEZOS_WALLET_SECRET with the key itself.

# EXAMPLES

**Deploying A Contract**
: tzstamp-manage deploy simple \-\-node https://testnet-tezos.giganode.io/

**Manually Uploading A Merkle Root On TestNet**
: tzstamp-manage upload-hash KT1AkQkRdLgE9NKSTCaPPZPgQuX7NUEtXzdj 84714a61037b3b4fa539008681cbfa97c7256930279ff4b54bad7366521afc67 \-\-node https://testnet-tezos.giganode.io/ \-\-faucet tz1MKs91KPzkpmZYz7Dvbd9dyq86murA1BrN.json

**Manually Uploading A Merkle Root On MainNet**

: tzstamp-manage upload-hash KT1K5npkpWK6wxkcBg97dZD77c2J7DmWvxSb a4e9de2410c9e7c3ac4c57bbc18beedc5935d5c8118e345a72baee00a9820b67 \-\-secret-path secret.txt

**Viewing Contract Storage**
: tzstamp-manage view storage KT1AkQkRdLgE9NKSTCaPPZPgQuX7NUEtXzdj \-\-node https://testnet-tezos.giganode.io/

**Checking If A Contract Is A TzStamp Instance**
: tzstamp-manage is-tzstamp KT1AkQkRdLgE9NKSTCaPPZPgQuX7NUEtXzdj \-\-node https://testnet-tezos.giganode.io/
