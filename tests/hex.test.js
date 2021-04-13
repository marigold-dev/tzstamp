const Hex = require('../dist/hex')

test('Encode byte array as hex string', () => {

  // Encode filled byte array
  const bytes = new Uint8Array([ 0, 1, 2 ])
  expect(Hex.stringify(bytes))
    .toBe('000102')

  // Encode empty byte array
  const empty = new Uint8Array([])
  expect(Hex.stringify(bytes))
    .toBe('')
})

test('Parse byte array from hex string', () => {

  // Parse odd-length valid hex string
  expect(Hex.parse('5f309'))
    .toEqual(new Uint8Array([ 5, 243, 9 ]))

  // Parse invalid hex string
  expect(() => Hex.parse('not a hex string'))
    .toThrow(SyntaxError)

  // Parse empty string
  expect(Hex.parse(''))
    .toEqual(new Uint8Array([]))
})
