import { MerkleTree } from "../src/mod.ts";
import { blake2b } from "../src/deps.deno.ts";

console.group("Hash a million blocks");
console.time("hashes");
for (let i = 1; i <= 1_000_000; ++i) {
  const block = crypto.getRandomValues(new Uint8Array(32));
  blake2b(block);
  if (i % 10_000 == 0) {
    console.timeLog("hashes", `${i.toLocaleString("en-US")}`);
  }
}
console.timeEnd("hashes");
console.groupEnd();

const merkleTree = new MerkleTree();
console.group("Appending a million blocks");
console.time("appends");
for (let i = 1; i <= 1_000_000; ++i) {
  const block = crypto.getRandomValues(new Uint8Array(32));
  merkleTree.append(block);
  if (i % 10_000 == 0) {
    console.timeLog("appends", `${i.toLocaleString("en-US")}`);
  }
}
console.timeEnd("appends");
console.groupEnd();
