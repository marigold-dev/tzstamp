const { concat, compare } = require('../dist/bytes')

test('Concatenate two byte arrays', () => {

  // Concatenate two filled arrays
  expect(concat(
    new Uint8Array([ 1, 2 ]),
    new Uint8Array([ 3, 4 ])
  ))
    .toEqual(new Uint8Array([ 1, 2, 3, 4 ]))

  // Concatenate a filled array with an empty array
  expect(concat(
    new Uint8Array([ 1, 2 ]),
    new Uint8Array([])
  ))
    .toEqual(new Uint8Array([ 1, 2 ]))

  // Concatenate two empty arrays
  expect(concat(
    new Uint8Array([]),
    new Uint8Array([])
  ))
    .toEqual(new Uint8Array([]))
})

test('Compare two byte arrays', () => {

  // Compare two equal byte arrays
  expect(compare(
    new Uint8Array([ 1, 2, 3 ]),
    new Uint8Array([ 1, 2, 3 ])
  ))
    .toBe(true)

  // Compare two same-length inequivalent byte arrays
  expect(compare(
    new Uint8Array([ 1, 2, 3 ]),
    new Uint8Array([ 1, 3, 5 ])
  ))
    .toBe(false)

  // Compare two different-length byte arrays
  expect(compare(
    new Uint8Array([ 1, 2, 3 ]),
    new Uint8Array([ 1, 2, 3, 4 ])
  ))
    .toBe(false)

  // Compare filled byte array to empty byte array
  expect(compare(
    new Uint8Array([ 1, 2, 3 ]),
    new Uint8Array([])
  ))
    .toBe(false)

  // Compare two empty byte arrays
  expect(compare(
    new Uint8Array([]),
    new Uint8Array([])
  ))
    .toBe(true)
})
