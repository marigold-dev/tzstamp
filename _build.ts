#!/usr/bin/env -S deno run --unstable --allow-read --allow-write

import { basename, join } from "./dev_deps.ts";

const readme = await Deno.readTextFile("readme.md");

console.log("Emitting node source");
const nodeSource = await Deno.emit("mod.ts", {
  compilerOptions: {
    module: "commonjs",
    sourceMap: false,
    noResolve: true,
  },
});

for (const [filePath, source] of Object.entries(nodeSource.files)) {
  let fileName = basename(filePath).slice(0, -6) + ".js";
  switch (fileName) {
    case "deps.js":
      continue;
    case "mod.js":
      fileName = "index.js";
      break;
  }
  if (fileName) {
    await Deno.writeTextFile(
      join("node", fileName),
      source.replace(new RegExp(`file://${Deno.cwd()}/(.*)\.ts`, "g"), "./$1"),
    );
  }
}

console.log("Emitting node types");
const nodeTypes = await Deno.emit("mod.ts", {
  compilerOptions: {
    declaration: true,
    emitDeclarationOnly: true,
    noResolve: true,
    removeComments: false,
  },
});

for (const [filePath, source] of Object.entries(nodeTypes.files)) {
  let fileName = basename(filePath).slice(0, -8) + ".d.ts";
  switch (fileName) {
    case "mod.d.ts":
      fileName = "index.d.ts";
      break;
  }
  await Deno.writeTextFile(
    join("node", fileName),
    source
      .split("\n")
      .filter((line) => !line.startsWith("/// <amd-module"))
      .join("\n")
      .replace(/\.\/(.*)\.ts/g, "./$1"),
  );
}

console.log("Emitting node readme");
await Deno.writeTextFile(
  join("node", "readme.md"),
  readme
    .replace(/import (.*) from .*;/, 'const $1 = require("@tzstamp/helpers");')
    .replace(/\(license\.txt\)/g, "(./license.txt)"),
);
