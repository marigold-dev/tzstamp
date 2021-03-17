const { Proof, Hex, VerificationStatus } = require('../dist/common')
const fs = require('fs').promises

void async function () {
  const json = await fs.readFile('test/test-proof.json', 'utf-8') 
  const proof = Proof.parse(json)
  const input = new TextEncoder().encode('hello')
  const root = await proof.derive(input)
  console.log(`Derived Root: ${Hex.stringify(root)}`)
  const result = await proof.verify(input, 'https://testnet-tezos.giganode.io')
  console.log(`Status: ${result.status}`)
  const { timestamp, publishedRoot } = result
  switch (result.status) {
    case VerificationStatus.VERIFIED:
      console.log(`Timestamp: ${timestamp.toLocaleDateString('en-US')} ${timestamp.toLocaleTimeString('en-US')}`)
    case VerificationStatus.DIFFERENT_ROOT:
      console.log(`Published root: ${Hex.stringify(publishedRoot)}`)
  }
}()
