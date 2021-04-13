const Base58 = require('../dist/base58')

test('Encode byte array as base-58 string', () => {

  // Encode 'hello' in UTF-8
  const hello = new Uint8Array([ 104, 101, 108, 108, 111 ])
  expect(Base58.encode(hello))
    .toBe('Cn8eVZg')

  // Encode empty byte array
  const empty = new Uint8Array([])
  expect(Base58.encode(empty))
    .toBe('')
})

test('Decode byte array from base-58 string', () => {

  // Decode valid base-58 encoding
  const hello = 'Cn8eVZg'
  expect(Base58.decode(hello))
    .toEqual(new Uint8Array([ 104, 101, 108, 108, 111 ]))

  // Decode empty string
  const empty = ''
  expect(Base58.decode(empty))
    .toEqual(new Uint8Array([]))

  // Decode invalid base-58 string
  const malformed = 'malformed' // 'l' is not in the base-58 alphabet
  expect(() => Base58.decode(malformed))
    .toThrow(SyntaxError)
})

test('Encode byte array as base-58 string with checksum', () => {

  // Checksum-encode 'hello' in UTF-8
  const hello = new Uint8Array([ 104, 101, 108, 108, 111 ])
  expect(Base58.encodeCheck(hello))
    .toBe('2L5B5yqsVG8Vt')

  // Checksum-encode empty byte array
  const empty = new Uint8Array([])
  expect(Base58.encodeCheck(empty))
    .toBe('3QJmnh')
})

test('Decode byte array from base-58 string with checksum', () => {

  // Checksum-decode valid base-58 encoding
  const hello = '2L5B5yqsVG8Vt'
  expect(Base58.decodeCheck(hello))
    .toEqual(new Uint8Array([ 104, 101, 108, 108, 111 ]))

  // Checksum-decode valid base-58 encoding with bad checksum
  const badChecksum = 'abcdefghij'
  expect(() => Base58.decodeCheck(badChecksum))
    .toThrow(Error)

  // Checksum-decode empty string
  const empty = '3QJmnh'
  expect(Base58.decodeCheck(empty))
    .toEqual(new Uint8Array([]))

  // Checksim-decode invalid base-58 string
  const malformed = 'malformed' // 'l' is not in the base-58 alphabet
  expect(() => Base58.decodeCheck(malformed))
    .toThrow(SyntaxError)
})
