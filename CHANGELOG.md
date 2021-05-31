# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning].

## [0.2.0] - 2021-05-30

### Added

- Proof serialization format version 1
  - JSON TypeDef schemas and validation.
  - Easier to read as JSON.
  - Three operations: "join", "blake2b", and "sha256".
- BLAKE2b operation options
  - Variable length digest
  - Keying
- Proof concatenation
  - Join two proofs with safety checks.
  - Allows storing proof segments for further construction later.
- Affixed proofs
  - Verify against a Tezos node.
  - Asserts that it is affixed to the Tezos Mainnet or an alternate network.
- Pending proofs
  - Resolves a remote proof and concatenates.
- Custom error classes
- Deno support
- Significantly improved inline documentation

### Changed

- Operation templating logic to be centralized in `Operation.from`. Static
  `from` method of subclasses inherit implementation from the super class and
  behave no differently.

### Removed

- Support for the version 0 serialization format.
- The `Proof.prototype.derive` method. Derivation should be obtained from the
  `Proof.prototype.derivation` property, which uses the stored hash as input.

## [0.1.0] - 2021-04-15

### Added

- Serialization/deserialization to/from JSON
- Basic operations
  - Append/Prepend arbitrary data
  - SHA-256
  - Blake2b (256-bit digest)
- Derive block from input
- Fetch block headers from RPC to check timestamp

[0.1.0]: https://gitlab.com/tzstamp/proof/-/releases/0.1.0
[Semantic Versioning]: https://semver.org/spec/v2.0.0.html
