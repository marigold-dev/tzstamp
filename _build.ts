#!/usr/bin/env -S deno run --unstable --allow-read=. --allow-write=.

import { basename, dirname, join, resolve, SEP } from "./dev_deps.ts";

const ROOTURL = dirname(import.meta.url);
const OUTDIR = resolve("dist");

console.log("Cleaning distribution directory");
await Deno.remove(OUTDIR, { recursive: true }).catch(() => {});
await Deno.mkdir(OUTDIR);

const nodeModules = Deno.emit("mod.ts", {
  compilerOptions: {
    module: "commonjs",
    sourceMap: false,
    noResolve: true,
  },
}).then(normalizeAndOutput);

const nodeTypes = Deno.emit("mod.ts", {
  compilerOptions: {
    declaration: true,
    emitDeclarationOnly: true,
    noResolve: true,
    removeComments: false,
  },
}).then(normalizeAndOutput);

console.log("Emitting files");
await Promise.all([
  nodeModules,
  nodeTypes,
]).catch(handleError);

async function normalizeAndOutput(result: Deno.EmitResult) {
  const fileEntries = Object.entries(result.files);
  for (const [path, source] of fileEntries) {
    // Normalize file names
    let name = basename(path);
    if (name.endsWith(".ts.d.ts")) {
      name = name.slice(0, -7).concat("d.ts");
      if (name == "mod.d.ts") name = "index.d.ts";
    } else if (name.endsWith(".ts.js")) {
      name = name.slice(0, -5).concat("js");
      if (name == "mod.js") name = "index.js";
    }

    // Normalize imports and references
    const notAMDModuleRef = (line: string) =>
      !line.startsWith("/// <amd-module");
    const absoluteRefs = new RegExp(`${ROOTURL}${SEP}(.*)\\.ts`, "g");
    const relativeRefs = /\.\/(.*)\.ts/g;
    let normalSource = source
      .split("\n")
      .filter(notAMDModuleRef)
      .join("\n")
      .replaceAll(
        "https://gitlab.com/tzstamp/helpers/raw/0.3.0/mod.ts",
        "@tzstamp/helpers",
      )
      .replaceAll(
        "https://deno.land/x/jtd@v0.1.0/mod.ts",
        "jtd",
      )
      .replace(absoluteRefs, "./$1")
      .replace(relativeRefs, "./$1");

    // Shim fetch
    if (name == "proof.js") {
      const proofLines = normalSource
        .split("\n");
      normalSource = [
        ...proofLines.slice(0, 3),
        `const fetch = require("node-fetch");`,
        ...proofLines.slice(3),
      ].join("\n");
    }

    // Write to output directory
    await Deno.writeTextFile(
      join(OUTDIR, name),
      normalSource,
    );
  }
}

function handleError(error: Error) {
  console.error(error.message);
  Deno.exit(1);
}
