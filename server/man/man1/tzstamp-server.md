% TZSTAMP-SERVER(1)
% John David Pressman
% December 2020

# NAME

tzstamp-server - Tezos trusted timestamping service

# SYNOPSIS

tzstamp-server

# DESCRIPTION

**tzstamp-server** is a service that utilizes the Tezos blockchain to perform
trusted timestamping of files. Files are hashed using the SHA-256 or blake2b
algorithm and then submitted to the server. tzstamp-server aggregates the hashes
in a merkle tree structure, or a tree of hashes. The root of that tree is
published to a smart contract on the Tezos blockchain, allowing many hashes to
be shown to have existed at a certain time on-chain for the cost of one. A
further benefit of the merkle tree structure is that users can prove their hash
was included in the merkle root without relying on tzstamp to store their
submitted hash long term. Once the root is published, users download an
inclusion proof consisting of the nodes necessary to derive a merkle root given
the submitted hash. Because nodes are stored as a binary tree, the number of
nodes necessary to derive the root grows logarithmically to the tree size,
ensuring that the proof stays small even as the server begins to handle millions
or billions of entries.

See https://www.gwern.net/Timestamping for more background information on
trusted timestamping services.

# ENVIRONMENT VARIABLES

The server configuration is stored in **.env.defaults**, a list of environment
variables whose default values are set by the file. Values can be overridden
by outside scripts and automation by setting the environment variables manually.

**$PORT**
: Port for the server to listen on

**$INTERVAL**
: Time between merkle root inclusions, expressed in seconds

**$BASE_URL**
: Base url of the server instance, e.g. "http://example.com"

**$FAUCET_KEY_PATH**
: Path to a Tezos testnet faucet key, **this is not for use on mainnet**

**TEZOS_WALLET_SECRET**
: Raw Tezos private key for use with local signing, **use this setting for mainnet instances**

**$CONTRACT_ADDRESS**
: KT1 of the Tezos tzstamp smart contract instance the server will use

**$RPC_URL**
: URL of the Tezos node to publish merkle roots with


