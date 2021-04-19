const { MerkleTree } = require('@tzstamp/tezos-merkle')
const { Operation } = require('@tzstamp/proof')
const { concatAll } = require('./bytes')
const { Hex, Base58, blake2b, concat } = require('@tzstamp/helpers')
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
 * Get a specific leaf-to-root path from a Tezos-style Merkle tree
 * @param {MerkleTree} merkleTree Merkle tree
 * @param {number} index Index of leaf
 */
function path (merkleTree, index) {
  if (index > merkleTree.size) {
    throw new RangeError('Index is larger than the size of the Merkle tree')
  }
  if (index < 0) {
    throw new RangeError('Index cannot be negative')
  }
  const paths = merkleTree.paths()
  for (let i = 0; i < index; ++i) {
    paths.next()
  }
  return paths.next().value
}

/**
 * Map a Merkle tree walk to proof operations
 */
function walkOperations (path) {
  const ops = [ Operation.blake2b() ]
  for (const [ relation, sibling ] of path.steps) {
    ops.push(
      relation
        ? Operation.prepend(sibling)
        : Operation.append(sibling),
      Operation.blake2b()
    )
  }
  return ops
}

/**
 * Calculate the hash of a validation pass
 */
function passHash (list) {
  if (list.length == 0) {
    return blake2b(new Uint8Array)
  }
  const tree = new MerkleTree
  for (const hash of list) {
    const raw = Base58.decodeCheck(hash).slice(2)
    tree.append(raw)
  }
  return tree.root
}

/**
 * Build proof steps from aggregator to block hash
 */
function buildSteps (block, opHash) {
  const steps = []

  // Operation hashes list
  const opHashes = block.operations
    .map(pass => pass
      .map(opGroup => opGroup.hash))

  // Target operation group
  const opGroup = block.operations
    .flat()
    .find(opGroup => opGroup.hash == opHash)

  // Aggregator root to operation group hash
  {
    const branch = encodeBranch(opGroup.branch)
    let contents = new Uint8Array
    if (opGroup.contents[0].kind == 'reveal') {
      contents = concat(
        contents,
        encodeReveal(opGroup.contents.shift())
      )
    }
    const transaction = opGroup.contents.shift()
    contents = concatAll(
      contents,
      108, // transaction tag
      encodeAddress(transaction.source),
      encodeZarith(BigInt(transaction.fee)),
      encodeZarith(BigInt(transaction.counter)),
      encodeZarith(BigInt(transaction.gas_limit)),
      encodeZarith(BigInt(transaction.storage_limit)),
      encodeZarith(BigInt(transaction.amount)),
      encodeContractId(transaction.destination),
      255, // parameters flag
      0, // entrypoint "default"
      encodeVariable( // payload metadata
        encodeArbitrary(
          Hex.parse(transaction.parameters.value.bytes)
        )
      ).slice(0, 9)
    )
    steps.push(
      Operation.prepend(
        concat(
          branch,
          contents
        )
      ),
      Operation.append(
        encodeSignature(opGroup.signature)
      ),
      Operation.blake2b()
    )
  }

  // Operation group hash to 4th-pass operation list hash
  {
    const tree = new MerkleTree
    for (const index in opHashes[3]) {
      const hash = opHashes[3][index]
      const bare = Base58.decodeCheck(hash).slice(2)
      tree.append(bare)
    }
    const target = opHashes[3].indexOf(opHash)
    steps.push(
      ...walkOperations(
        path(tree, target)
      )
    )
  }

  // 4rd-pass operation list hash to root operations hash
  steps.push(
    Operation.blake2b(),
    Operation.prepend(
      blake2b(
        passHash(opHashes[2])
      )
    ),
    Operation.blake2b(),
    Operation.prepend(
      blake2b(
        concat(
          blake2b(
            passHash(opHashes[0])
          ),
          blake2b(
            passHash(opHashes[1])
          )
        )
      )
    ),
    Operation.blake2b()
  )

  // Operations hash to block hash
  const timestamp = new Date(block.header.timestamp).getTime() / 1000
  steps.push(
    Operation.prepend(
      concatAll(
        Hex.parse( // level
          block.header.level
            .toString(16)
            .padStart(8, '0')
        ),
        block.header.proto, // proto
        Base58.decodeCheck(block.header.predecessor).slice(2), // predecessor
        Hex.parse( // timestamp
          timestamp
            .toString(16)
            .padStart(16, '0')
        ),
        block.header.validation_pass // validation passes
      )
    ),
    Operation.append( // fitness
      concatAll(
        encodeVariable(
          concatAll(...block.header.fitness
            .map(Hex.parse)
            .map(encodeVariable))
        ),
        Base58.decodeCheck(block.header.context).slice(2), // context
        Hex.parse( // priority
          block.header.priority
            .toString(16)
            .padStart(4, '0')
        ),
        Hex.parse(block.header.proof_of_work_nonce), // proof_of_work_nonce
        0, // seed_nonce_hash flag
        encodeSignature(block.header.signature) // signature
      )
    ),
    Operation.blake2b()
  )

  return steps
}

module.exports = {
  path,
  walkOperations,
  passHash,
  buildSteps
}
