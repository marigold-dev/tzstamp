# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning].

## [0.3.0] - 2021-06-17

### Added

- SHA-256 helper
- Base58check prefixing

### Changed

- Moved `blake2b` convenience function to `Blake2b.digest`.

## [0.2.0] - 2021-05-14

### Added

- `Blake2b` class underpinning the `blake2b` convenience function
- Variable BLAKE2b digest lengths and keying
- Node read-stream collection helper
- Hexadecimal and Base58 string validators

### Changed

- Better concatenation helper
  - Accepts any number of inputs
  - Accepts bare numbers

## Removed

- The Base58 `ALPHABET` constant

## [0.1.1] - 2021-04-14

### Fixed

- Parse empty hex string to empty byte array
- Base-58 encode an empty byte array as an empty string
- Check for invalid characters when base-58 encoding
- Throw `SyntaxError` errors when parsing an invalid hex and base-58
- Improve error messages

## [0.1.0] - 2021-03-24

### Added

- Hex string helpers
  - Encode from Uint8Array byte array
  - Decode from string
- Base-58 string helpers
  - Uses Bitcoin alphabet
  - Encode from Uint8Array byte array
  - Decode from string
  - Encode and decode with SHA-256 checksum
- BLAKE2b 32-byte hashing helper
- Concatenate Uint8Arrays helper
- Compare Uint8Arrays helper

[Semantic Versioning]: https://semver.org/spec/v2.0.0.html
[0.1.0]: https://gitlab.com/tzstamp/helpers/-/releases/0.1.0
[0.1.1]: https://gitlab.com/tzstamp/helpers/-/releases/0.1.1
[0.2.0]: https://gitlab.com/tzstamp/helpers/-/releases/0.2.0
[0.3.0]: https://gitlab.com/tzstamp/helpers/-/releases/0.3.0
[0.3.2]: https://github.com/marigold-dev/tzstamp/releases/tag/0.3.2