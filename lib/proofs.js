const { MerkleTree } = require('@tzstamp/tezos-merkle')
const { Proof, AffixedProof, JoinOperation, Blake2bOperation } = require('@tzstamp/proof')
const { Hex, Base58, Blake2b, concat, compare } = require('@tzstamp/helpers')
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

/**
 * Builds a proof committing the aggregator root to a block hash.
 *
 * @param {object} block Block data
 * @param {string} opHash Operation hash
 * @param {Uint8Array} root Aggregator root
 */
async function buildHighProof (block, opHash, root) {
  const opGroup = block.operations[3].find((opGroup) => opGroup.hash == opHash)
  if (!opGroup) {
    throw new Error('Target operation group not found in fourth validation pass of the given block')
  }
  const opGroupProof = buildOpGroupProof(opGroup, root)
  const opsHashProof = buildOpsHashProof(block.operations, opHash)
  const blockHashProof = buildBlockHashProof(block.chain_id, block.header)
  return opGroupProof
    .concat(opsHashProof)
    .concat(blockHashProof)
}

/**
 * Builds a proof committing the aggregator root to the operation hash.
 *
 * @param {object} opGroup Operation group data
 * @param {Uint8Array} root Aggregator root
 */
function buildOpGroupProof (opGroup, root) {
  const [ revealOp, txnOp ] = separateOperations(opGroup.contents)
  const revealSegment = revealOp
    ? encodeReveal(revealOp)
    : new Uint8Array
  const txnSegment = concat(
    108, // transaction tag
    encodeAddress(txnOp.source),
    encodeZarith(BigInt(txnOp.fee)),
    encodeZarith(BigInt(txnOp.counter)),
    encodeZarith(BigInt(txnOp.gas_limit)),
    encodeZarith(BigInt(txnOp.storage_limit)),
    encodeZarith(BigInt(txnOp.amount)),
    encodeContractId(txnOp.destination),
    255, // parameters flag
    0, // entrypoint "default"
    encodeVariable( // payload metadata
      encodeArbitrary(
        Hex.parse(txnOp.parameters.value.bytes)
      )
    ).slice(0, 9)
  )
  const prepend = concat(
    encodeBranch(opGroup.branch),
    revealSegment,
    txnSegment
  )
  const append = encodeSignature(opGroup.signature)
  return new Proof({
    hash: root,
    operations: [
      new JoinOperation({ prepend, append }),
      new Blake2bOperation()
    ]
  })
}

/**
 * Separates the operations in a transaction operation group.
 *
 * @param {object[]} contents
 */
function separateOperations (contents) {
  if (contents.length == 1) {
    return [ undefined, contents[0] ]
  } else if (contents.length == 2) {
    return contents
  } else {
    throw new RangeError('Unexpected number of operations in operation group')
  }
}

/**
 * Builds a proof committing the operation hash to the operations pass list hash.
 *
 * @param {object[][]} passList Operations list list
 * @param {string} opHash Operation hash
 */
function buildOpsHashProof (passList, opHash) {
  const passTrees = buildPassTrees(passList)
  const fourthPassProof = buildFourthPassProof(passTrees[3], opHash)
  const multipassTree = new MerkleTree()
  for (const passTree of passTrees) {
    multipassTree.append(
      passTree.root ||
      Blake2b.digest(new Uint8Array())
    )
  }
  const multipassProof = multipassTree.path(3).toProof()
  return fourthPassProof.concat(multipassProof)
}

/**
 * Builds a proof committing the operation hash to the fourth operation pass hash.
 *
 * @param {MerkleTree} passTree Fourth operation pass Merkle tree
 * @param {string} opHash Operation hash
 */
function buildFourthPassProof (passTree, opHash) {
  const rawOpHash = Base58.decodeCheck(opHash, new Uint8Array([ 5, 116 ]))
  const opPath = Array
    .from(passTree.paths())
    .find((path) => compare(path.block, rawOpHash))
  if (!opPath) {
    throw new Error('Target operation group not found in fourth pass')
  }
  return opPath.toProof()
}

/**
 * Builds a proof committing the operations hash to the block hash.
 *
 * @param {string} network Tezos network identifier
 * @param {object} header Block header data
 */
function buildBlockHashProof (network, header) {
  const timestamp = new Date(header.timestamp)
  const prepend = concat(
    Hex.parse( // level
      header.level
        .toString(16)
        .padStart(8, '0')
    ),
    header.proto, // proto
    Base58.decodeCheck(
      header.predecessor,
      new Uint8Array([ 1, 52 ])
    ), // predecessor
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
    Base58.decodeCheck(
      header.context,
      new Uint8Array([ 79, 199 ])
    ), // context
    Hex.parse( // priority
      header.priority
        .toString(16)
        .padStart(4, '0')
    ),
    Hex.parse(header.proof_of_work_nonce), // proof_of_work_nonce
    0, // seed_nonce_hash flag
    encodeSignature(header.signature) // signature
  )
  const rawOpHash = Base58.decodeCheck(
    header.operations_hash,
    new Uint8Array([ 29, 159, 109 ])
  )
  return new AffixedProof({
    hash: rawOpHash,
    operations: [
      new JoinOperation({ append, prepend }),
      new Blake2bOperation
    ],
    network,
    timestamp
  })
}

/**
 * Builds a list of Merkle trees from a operations pass list.
 *
 * @param {object[][]} passList
 */
function buildPassTrees (passList) {
  const trees = []
  for (const pass of passList) {
    const merkleTree = new MerkleTree()
    for (const opGroup of pass) {
      merkleTree.append(
        Base58.decodeCheck(
          opGroup.hash,
          new Uint8Array([ 5, 116 ])
        )
      )
    }
    trees.push(merkleTree)
  }
  return trees
}

module.exports = {
  buildHighProof
}
