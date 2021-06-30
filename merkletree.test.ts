import { MerkleTree } from "./merkletree.ts";
import { Blake2b, concat } from "./deps.ts";
import { assert, assertEquals, assertThrows } from "./dev_deps.ts";

const blocks: Uint8Array[] = Array.from(
  { length: 7 },
  () => crypto.getRandomValues(new Uint8Array(32)),
);

const manualRoot = hashcat(
  hashcat(
    hashcat(
      Blake2b.digest(blocks[0]),
      Blake2b.digest(blocks[1]),
    ),
    hashcat(
      Blake2b.digest(blocks[2]),
      Blake2b.digest(blocks[3]),
    ),
  ),
  hashcat(
    hashcat(
      Blake2b.digest(blocks[4]),
      Blake2b.digest(blocks[5]),
    ),
    hashcat(
      Blake2b.digest(blocks[6]),
      Blake2b.digest(blocks[6]),
    ),
  ),
);

function hashcat(a: Uint8Array, b: Uint8Array): Uint8Array {
  return Blake2b.digest(concat(a, b));
}

Deno.test({
  name: "Merkle tree appending",
  fn() {
    const merkleTree = new MerkleTree();

    // Single append
    merkleTree.append(blocks[0]);
    assertEquals(merkleTree.size, 1);

    // Multi append
    merkleTree.append(blocks[1], blocks[2]);
    assertEquals(merkleTree.size, 3);

    // Deduplication
    const dedupeMerkleTree = new MerkleTree({ deduplicate: true });
    dedupeMerkleTree.append(
      blocks[0],
      blocks[0],
    );
    assertEquals(dedupeMerkleTree.size, 1);
  },
});

Deno.test({
  name: "Merkle tree root derivation",
  fn() {
    const merkleTree = new MerkleTree();
    merkleTree.append(...blocks);

    // Compare progressively calculated root
    assertEquals(merkleTree.root, manualRoot);

    const sequence: Uint8Array[] = [];
    for (let i = 0; i < 65; ++i) {
      sequence.push(new Uint8Array([i]));
    }

    const bigMerkleTree = new MerkleTree();
    bigMerkleTree.append(...sequence);

    // Calculate big manual root
    const raise = (array: Uint8Array[], length: number): Uint8Array[] => {
      const result = [];
      for (let i = 0; i < length; i += 2) {
        result.push(hashcat(
          array[i] ?? array[array.length - 1],
          array[i + 1] ?? array[array.length - 1],
        ));
      }
      return result;
    };

    const L0 = sequence.map((item) => Blake2b.digest(item));
    const L1 = raise(L0, 128);
    const L2 = raise(L1, 64);
    const L3 = raise(L2, 32);
    const L4 = raise(L3, 16);
    const L5 = raise(L4, 8);
    const L6 = raise(L5, 4);
    const manualBigRoot = hashcat(L6[0], L6[1]);

    // Large tail
    assertEquals(bigMerkleTree.root, manualBigRoot);
  },
});

Deno.test({
  name: "Merkle tree convenience accessors",
  fn() {
    const merkleTree = new MerkleTree();
    merkleTree.append(...blocks);

    // Access leaves layer
    assertEquals(merkleTree.size, blocks.length);

    // Check for leaf inclusion
    assert(merkleTree.has(blocks[2]));
    assert(merkleTree.has(Uint8Array.from(blocks[3])));
    assert(!merkleTree.has(new Uint8Array([0, 55])));
  },
});

Deno.test({
  name: "Merkle tree path generation",
  fn() {
    const merkleTree = new MerkleTree();
    merkleTree.append(...blocks);

    // Get out-of-bound paths
    assertThrows(() => merkleTree.path(2.5), RangeError);
    assertThrows(() => merkleTree.path(-1), RangeError);
    assertThrows(() => merkleTree.path(1000), RangeError);

    // Iteratively test each path
    for (const path of merkleTree.paths()) {
      let result = path.leaf;
      for (const { hash, relation } of path.siblings) {
        switch (relation) {
          case "left":
            result = hashcat(hash, result);
            break;
          case "right":
            result = hashcat(result, hash);
            break;
        }
      }
      assertEquals(result, path.root);
      assertEquals(path.root, merkleTree.root);
    }
  },
});

Deno.test({
  name: "Path to proof",
  fn() {
    const merkleTree = new MerkleTree();
    merkleTree.append(...blocks);
    assertEquals(merkleTree.root, manualRoot);
    for (const path of merkleTree.paths()) {
      const proof = path.toProof();
      assertEquals(proof.hash, path.block);
      assertEquals(proof.derivation, manualRoot);
    }
  },
});
