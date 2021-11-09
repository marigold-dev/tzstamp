#!/usr/bin/env -S deno run --allow-read

import { parse } from "https://deno.land/std@0.97.0/flags/mod.ts";
import { createHash } from "https://deno.land/std@0.97.0/hash/mod.ts";
import { unreachable } from "https://deno.land/std@0.97.0/testing/asserts.ts";
import { Schema, validate } from "https://deno.land/x/jtd@v0.1.0/mod.ts";
import { Hex } from "https://raw.githubusercontent.com/marigold-dev/tzstamp/0.3.4/helpers/mod.ts";
import {
  AffixedProof,
  Blake2bOperation,
  JoinOperation,
  Operation,
  Sha256Operation,
} from "https://raw.githubusercontent.com/marigold-dev/tzstamp/0.3.4/proof/mod.ts";

const options = parse(Deno.args, {
  string: [
    "version",
    "proof",
    "hash",
    "file",
    "timestamp",
  ],
});

function isValid<T>(schema: Schema, instance: unknown): instance is T {
  return validate(schema, instance).length == 0;
}

const numverProofSchema: Schema = {
  properties: {
    version: { type: "uint32" },
  },
  additionalProperties: true,
};

interface NumverProofTemplate {
  version: number;
}

const version0ProofSchema: Schema = {
  properties: {
    version: { type: "uint32" },
    network: { type: "string" },
    ops: {
      elements: {
        elements: { type: "string" },
      },
    },
  },
};

interface Version0ProofTemplate extends NumverProofTemplate {
  version: 0;
  network: string;
  ops: string[][];
}

async function upgradeVersion0(): Promise<AffixedProof> {
  if (
    !options.proof ||
    !options.timestamp ||
    (!options.file && !options.hash)
  ) {
    console.log(
      "Version 0 usage: tzstamp-upgrade --version 0 --timestamp <iso-datetime-string> --proof <file> [--file <file> | --hash <hex>]",
    );
    Deno.exit(2);
  }
  if (options.file && options.hash) {
    throw new Error("Supply either file or hash, not both");
  }

  let timestamp: Date;
  try {
    timestamp = new Date(options.timestamp);
  } catch (error) {
    throw new Error(`Unable to parse timestamp: ${error.message}`);
  }

  // Get version 0 proof
  let v0Proof: Version0ProofTemplate;
  try {
    const text = await Deno.readTextFile(options.proof);
    const template: unknown = JSON.parse(text);
    if (
      !isValid<NumverProofTemplate>(numverProofSchema, template) ||
      template.version != 0 ||
      !isValid<Version0ProofTemplate>(version0ProofSchema, template)
    ) {
      throw new Error("Invalid version 0 proof template");
    }
    v0Proof = template;
  } catch (error) {
    throw new Error(`Unable to read proof: ${error.message}`);
  }

  // Get hash
  let hash: Uint8Array;
  try {
    if (options.file) {
      const buffer = await Deno.readFile(options.file);
      hash = new Uint8Array(
        createHash("sha256")
          .update(buffer)
          .digest(),
      );
    } else if (options.hash) {
      hash = Hex.parse(options.hash);
    } else {
      unreachable();
    }
  } catch (error) {
    throw new Error(`Unable to get hash: ${error.message}`);
  }

  // Build operations
  const operations: Operation[] = [];
  for (let i = 0; i < v0Proof.ops.length; ++i) {
    const op = v0Proof.ops[i][0];
    switch (op) {
      case "blake2b":
        operations.push(new Blake2bOperation());
        break;
      case "sha-256":
        operations.push(new Sha256Operation());
        break;
      case "prepend": {
        const prepend = Hex.parse(v0Proof.ops[i][1]);
        let append = undefined;
        if (v0Proof.ops[i + 1][0] == "append") {
          append = Hex.parse(v0Proof.ops[i + 1][1]);
          ++i;
        }
        operations.push(new JoinOperation({ prepend, append }));
        break;
      }
      case "append":
        operations.push(
          new JoinOperation({
            append: Hex.parse(v0Proof.ops[i][1]),
          }),
        );
    }
  }

  // Create proof
  return new AffixedProof({
    hash,
    operations,
    network: v0Proof.network,
    timestamp,
  });
}

async function upgrade() {
  if (!options.version) {
    console.log("Usage: tzstamp-upgrade --version <N> [options]");
    console.log("Available versions are: 0");
    Deno.exit(2);
  }
  let proof: AffixedProof;
  switch (options.version) {
    case "0":
      proof = await upgradeVersion0();
      break;
    default:
      console.log(`Unsupported version "${options.version}"`);
      Deno.exit(1);
  }
  console.log(JSON.stringify(proof));
}

await upgrade().catch((error) => {
  console.error(error.message);
  Deno.exit(1);
});
