const { Block } = require('../dist/block')

test('Successful block lookup', async () => {
  const block = new Block('NetXSgo1ZT2DRUG', new Uint8Array([
     64, 167, 173,  57, 179, 254, 123, 171,
     45,  55, 232,  18,  81,  48, 249, 132,
    217, 205, 174,  25, 197,  65,  81,   2,
    158,  81, 104, 103,  55,  67, 134, 121
  ]))
  expect(block.address)
    .toBe('BLCkrrtSHYoLMJ5k5N6urr3kd5QR8k9uFZ3iBqqoLEaNz3t3BJA')
  const date = await block.lookup('https://testnet-tezos.giganode.io')
  expect(date.getTime())
    .toBe(1616007899000)
})

test('Failed block lookup', async () => {
  const block = new Block('NetXdQprcVkpaWU', new Uint8Array([
     50, 77, 207,   2, 125, 212, 163,  10,
    147, 44,  68,  31,  54,  90,  37, 232,
    107, 23,  61, 239, 164, 184, 229, 137,
     72, 37,  52, 113, 184,  27, 114, 207
  ]))
  expect(block.address)
    .toBe('BL6SHKhzVL3ty3TG8icuQDWbobS2GbbY6YMdEsv4r3UCrM9NmY6')
  await expect(block.lookup('https://mainnet-tezos.giganode.io'))
    .rejects.toBe(404)
})
