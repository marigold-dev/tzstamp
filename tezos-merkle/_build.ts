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
      "https://raw.githubusercontent.com/marigold-dev/tzstamp/0.3.2/helpers/mod.ts",
      "@tzstamp/helpers",
    ],
    [
      "https://raw.githubusercontent.com/marigold-dev/tzstamp/0.3.2/proof/mod.ts",
      "@tzstamp/proof",
    ],
  ]),
});
