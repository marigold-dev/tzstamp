# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning].

## Unreleased

### Added

- Blake2b class
- Variable Blake2b digest lengths and keying
- Regular expression for testing valid hex strings
- Node read-stream collection helper
- Base58 validator regular expression

### Changed

- Base58 and hex string helpers are namespaced
- Renamed `Hex.HEX_TEST` regular expression to `Hex.validator`
- Concatenation helper accepts any number of inputs and can process bare numbers
- Move the BLAKE2b min/max byte constants into the `Blake2b` class as static
  constants

## Removed

- The Base58 alphabet constant

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
- Blake2b 32-byte hashing helper
- Concatenate Uint8Arrays helper
- Compare Uint8Arrays helper

[0.1.0]: https://gitlab.com/tzstamp/helpers/-/releases/0.1.0
[0.1.1]: https://gitlab.com/tzstamp/helpers/-/releases/0.1.1
[Semantic Versioning]: https://semver.org/spec/v2.0.0.html
