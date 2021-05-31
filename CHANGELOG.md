# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning][semver].

## [0.2.0] - 2021-05-31

### Added

- Method to calculate specific path by index.
- Path-to-proof conversion.

### Changed

- The `Path` interface is more ergonomic.
- The `Step` interface is renamed to `Sibling`.
- Blocks are stored internally, rather than just their hashes. Keep this in mind
  when appending large blocks.
- Block deduplication is configurable and disabled by default.

### Removed

- Methods to access internal nodes and leaves.

## [0.1.0] - 2021-04-15

### Added

- Minimal Tezos-style Merkle tree implementation
  - Fast element appends
  - Leaf-to-root paths generator

[semver]: https://semver.org/spec/v2.0.0.html
[0.1.0]: https://gitlab.com/tzstamp/tezos-merkle/-/releases/0.1.0
[0.2.0]: https://gitlab.com/tzstamp/tezos-merkle/-/releases/0.2.0
