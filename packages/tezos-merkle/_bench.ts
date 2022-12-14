#!/usr/bin/env -S deno run

import { MerkleTree } from "./mod.ts";
import { Blake2b } from "./deps.ts";
import { bench, BenchmarkTimer, runBenchmarks } from "./dev_deps.ts";

bench({
  name: "Hash one hundred 32-byte blocks",
  func: nHashes(100),
});

bench({
  name: "Hash ten thousand 32-byte blocks",
  func: nHashes(10_000),
});

bench({
  name: "Hash one million 32-byte blocks",
  func: nHashes(1_000_000),
});

function nHashes(n: number) {
  return (timer: BenchmarkTimer) => {
    timer.start();
    for (let i = 0; i < n; ++i) {
      const block = crypto.getRandomValues(new Uint8Array(32));
      Blake2b.digest(block);
    }
    timer.stop();
  };
}

bench({
  name: "Append one hundred 32-byte blocks",
  func: nAppends(100),
});

bench({
  name: "Append ten thousand 32-byte blocks",
  func: nAppends(10_000),
});

bench({
  name: "Append one million 32-byte blocks",
  func: nAppends(1_000_000),
});

function nAppends(n: number) {
  const merkleTree = new MerkleTree();
  return (timer: BenchmarkTimer) => {
    timer.start();
    for (let i = 0; i < n; ++i) {
      const block = crypto.getRandomValues(new Uint8Array(32));
      merkleTree.append(block);
    }
    timer.stop();
  };
}

runBenchmarks();
