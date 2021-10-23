#!/usr/bin/env -S deno run --unstable --allow-read=. --allow-write=dist

import { exportCommonJS } from "./dev_deps.ts";

await exportCommonJS({
  filePaths: [
    "deps.ts",
    "mod.ts",
    "merkletree.ts",
    "path.ts",
  ],
  outDir: "dist",
  dependencyMap: new Map([
    [
      "https://gitlab.com/tzstamp/helpers/-/raw/0.3.0/mod.ts",
      "@tzstamp/helpers",
    ],
    [
      "https://gitlab.com/tzstamp/proof/-/raw/0.3.0/mod.ts",
      "@tzstamp/proof",
    ],
  ]),
});
