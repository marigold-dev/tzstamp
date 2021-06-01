const { MerkleTree } = require('@tzstamp/tezos-merkle')
const { Proof, AffixedProof, JoinOperation, Blake2bOperation } = require('@tzstamp/proof')
const { Hex, Base58, blake2b, concat, compare } = require('@tzstamp/helpers')
const {
  encodeBranch,
  encodeReveal,
  encodeAddress,
  encodeZarith,
  encodeContractId,
  encodeSignature,
  encodeVariable,
  encodeArbitrary
} = require('./micheline')

function operationGroupProof (root, operationGroup) {

  // Separate operations
  let revealOperation
  let transactionOperation
  if (operationGroup.contents[0].kind == 'reveal') {
    revealOperation = operationGroup.contents[0]
    transactionOperation = operationGroup.contents[1]
  } else {
    transactionOperation = operationGroup.contents[0]
  }

  // Encode reveal operation (if present)
  const reveal = revealOperation
    ? encodeReveal(revealOperation)
    : new Uint8Array

  // Encode transaction operation
  const transaction = concat(
    108, // transaction tag
    encodeAddress(transactionOperation.source),
    encodeZarith(BigInt(transactionOperation.fee)),
    encodeZarith(BigInt(transactionOperation.counter)),
    encodeZarith(BigInt(transactionOperation.gas_limit)),
    encodeZarith(BigInt(transactionOperation.storage_limit)),
    encodeZarith(BigInt(transactionOperation.amount)),
    encodeContractId(transactionOperation.destination),
    255, // parameters flag
    0, // entrypoint "default"
    encodeVariable( // payload metadata
      encodeArbitrary(
        Hex.parse(transactionOperation.parameters.value.bytes)
      )
    ).slice(0, 9)
  )

  // Build proof
  const prepend = concat(
    encodeBranch(operationGroup.branch),
    reveal,
    transaction
  )
  const append = encodeSignature(operationGroup.signature)
  return new Proof({
    hash: root,
    operations: [
      new JoinOperation({ prepend, append }),
      new Blake2bOperation
    ]
  })
}

function operationsHashProof (operationHash, passList) {
  const rawOpHash = Base58.decodeCheck(operationHash).slice(2)

  // Construct validation pass trees
  const passTrees = []
  for (const pass of passList) {
    const merkleTree = new MerkleTree
    passTrees.push(merkleTree)
    for (const opGroup of pass) {
      const data = Base58.decodeCheck(opGroup.hash).slice(2)
      merkleTree.append(data)
    }
  }

  // Get 4th pass proof
  let passProof
  for (const path of passTrees[3].paths()) {
    if (compare(path.block, rawOpHash)) {
      passProof = path.toProof()
      break
    }
  }
  if (!passProof) {
    throw new Error('Target operation group not found in fourth pass')
  }

  // Build the multipass tree
  const multipassTree = new MerkleTree
  for (const passTree of passTrees) {
    multipassTree.append(passTree.root ?? blake2b(new Uint8Array))
  }

  const multipassProof = multipassTree.path(3).toProof()
  return passProof.concat(multipassProof)
}

function blockHeaderProof (network, header) {
  const timestamp = new Date(header.timestamp)
  const operationsHash = Base58.decodeCheck(header.operations_hash).slice(3)
  const prepend = concat(
    Hex.parse( // level
      header.level
        .toString(16)
        .padStart(8, '0')
    ),
    header.proto, // proto
    Base58.decodeCheck(header.predecessor).slice(2), // predecessor
    Hex.parse( // timestamp
      Math.floor(timestamp.getTime() / 1000)
        .toString(16)
        .padStart(16, '0')
    ),
    header.validation_pass // validation passes
  )
  const append = concat(
    encodeVariable( // fitness
      concat(
        ...header.fitness
          .map(Hex.parse)
          .map(encodeVariable)
      )
    ),
    Base58.decodeCheck(header.context).slice(2), // context
    Hex.parse( // priority
      header.priority
        .toString(16)
        .padStart(4, '0')
    ),
    Hex.parse(header.proof_of_work_nonce), // proof_of_work_nonce
    0, // seed_nonce_hash flag
    encodeSignature(header.signature) // signature
  )

  // Build proof
  return new AffixedProof({
    hash: operationsHash,
    operations: [
      new JoinOperation({ append, prepend }),
      new Blake2bOperation
    ],
    network,
    timestamp
  })
}

module.exports = {
  operationGroupProof,
  operationsHashProof,
  blockHeaderProof
}
