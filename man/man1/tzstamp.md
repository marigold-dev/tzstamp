% TZSTAMP(1)
% John David Pressman, Benjamin Herman
% December 2020

# NAME

tzstamp - Submit and verify hashes with the tzstamp Tezos timestamping service

# SYNOPSIS

**tzstamp** **stamp** [*FILEPATH*]

**tzstamp** **verify** [*HASH* | *FILEPATH*] [*MERKLE_PROOF_FILEPATH* | *MERKLE_PROOF_URL*]

# DESCRIPTION

**tzstamp** is a service that utilizes the Tezos blockchain to perform
trusted timestamping of files. Files are hashed using the SHA-256 algorithm and
then the hash is submitted to the tzstamp service. tzstamp aggregates the hashes
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

# EXAMPLES

tzstamp stamp package.json

tzstamp verify 344f904b931e6033102e4235e592ea19f800ff3737ff3a18c47cfe63dbea2ed7 http://localhost:8080/api/proof/bc46aa6337581b95201294a253f94c2ed3d51e11f17cabf84ad118d1d91ef080
