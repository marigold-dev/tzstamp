#!/usr/bin/env -S deno run --unstable --allow-read=. --allow-write=dist

import { exportCommonJS } from "https://gitlab.com/-/snippets/2141302/raw/main/export_commonjs.ts";

await exportCommonJS({
  filePaths: [
    "deps.ts",
    "mod.ts",
    "operation.ts",
    "proof.ts",
    "errors.ts",
    "_validate.ts",
  ],
  dependencyMap: new Map([
    ["https://gitlab.com/tzstamp/helpers/raw/0.3.0/mod.ts", "@tzstamp/helpers"],
    ["https://deno.land/x/jtd@v0.1.0/mod.ts", "jtd"],
  ]),
  shims: [{
    defaultImport: "fetch",
    moduleSpecifier: "node-fetch",
  }],
  outDir: "dist",
});
