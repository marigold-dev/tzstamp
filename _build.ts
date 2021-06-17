#!/usr/bin/env -S deno run --unstable --allow-read=. --allow-write=.

import { basename, join, resolve } from "./dev_deps.ts";

const OUTDIR = resolve("dist");

console.log("Cleaning distribution directory");
await Deno.remove(OUTDIR, { recursive: true }).catch(() => {});
await Deno.mkdir(OUTDIR);

Promise.all([
  // Node modules
  Deno.emit("mod.ts", {
    compilerOptions: {
      module: "commonjs",
      sourceMap: false,
      noResolve: true,
    },
  }).then(writeNodeModules),
  // Node types
  Deno.emit("mod.ts", {
    compilerOptions: {
      declaration: true,
      emitDeclarationOnly: true,
      noResolve: true,
      removeComments: false,
    },
  }).then(writeNodeTypes),
  // Browser bundle
  Deno.emit("mod.ts", {
    bundle: "module",
  }).then(writeBrowserBundle),
]).catch((error) => {
  console.log(error);
  Deno.exit(1);
});

async function writeNodeModules({ files }: Deno.EmitResult) {
  console.log("Emitting node modules");
  for (const [filePath, source] of Object.entries(files)) {
    let fileName = basename(filePath).slice(0, -6) + ".js";
    switch (fileName) {
      case "mod.js":
        fileName = "index.js";
        break;
    }
    if (fileName) {
      await Deno.writeTextFile(
        join(OUTDIR, fileName),
        source.replace(
          new RegExp(`file://${Deno.cwd()}/(.*)\.ts`, "g"),
          "./$1",
        ),
      );
    }
  }
}

async function writeNodeTypes({ files }: Deno.EmitResult) {
  console.log("Emitting node types");
  for (const [filePath, source] of Object.entries(files)) {
    let fileName = basename(filePath).slice(0, -8) + ".d.ts";
    switch (fileName) {
      case "mod.d.ts":
        fileName = "index.d.ts";
        break;
    }
    await Deno.writeTextFile(
      join(OUTDIR, fileName),
      source
        .split("\n")
        .filter((line) => !line.startsWith("/// <amd-module"))
        .join("\n")
        .replace(/\.\/(.*)\.ts/g, "./$1"),
    );
  }
}

async function writeBrowserBundle({ files }: Deno.EmitResult) {
  console.log("Emitting browser bundle");
  await Deno.writeTextFile(
    join(OUTDIR, "bundle.js"),
    files["deno:///bundle.js"],
  );
}
