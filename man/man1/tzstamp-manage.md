% TZSTAMP-MANAGE(1)
% John David Pressman, Benjamin Herman
% December 2020

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
