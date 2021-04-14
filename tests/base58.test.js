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

  // Encode byte array with leading zeroes
  const leadingZeroes = new Uint8Array([ 0, 0, 0, 10, 20, 30, 40 ])
  expect(Base58.encode(leadingZeroes))
    .toBe('111FwdkB')
})

test('Decode byte array from base-58 string', () => {

  // Decode valid base-58 encoding
  expect(Base58.decode('Cn8eVZg'))
    .toEqual(new Uint8Array([ 104, 101, 108, 108, 111 ]))

  // Decode empty string
  expect(Base58.decode(''))
    .toEqual(new Uint8Array([]))

  // Decode invalid base-58 string
  expect(() => Base58.decode('malformed')) // 'l' is not in the base-58 alphabet
    .toThrow(SyntaxError)

  // Decode with leading zeroes
  expect(Base58.decode('111FwdkB'))
    .toEqual(new Uint8Array([ 0, 0, 0, 10, 20, 30, 40 ]))
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
  expect(Base58.decodeCheck('2L5B5yqsVG8Vt'))
    .toEqual(new Uint8Array([ 104, 101, 108, 108, 111 ]))

  // Checksum-decode valid base-58 encoding with bad checksum
  expect(() => Base58.decodeCheck('abcdefghij'))
    .toThrow(Error)

  // Checksum-decode empty string
  expect(Base58.decodeCheck('3QJmnh'))
    .toEqual(new Uint8Array([]))

  // Checksim-decode invalid base-58 string
  expect(() => Base58.decodeCheck('malformed')) // 'l' is not in the base-58 alphabet
    .toThrow(SyntaxError)
})
