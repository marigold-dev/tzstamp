# Export Deno Project as CommonJS

Example usage:

```js
import { exportCommonJS } from "https://gitlab.com/tzstamp/export-commonjs/-/raw/main/mod.ts";

await exportCommonJS({
  filePaths: [
    "mod.ts",
    "deps.ts",
    "src/**/*.ts",
  ],
  outDir: "dist",
  clean: true, // Delete contents of "dist" before export
  dependencyMap: new Map([ // Substitute dependencies
    [
      "https://deno.land/std@0.100.0/fs/mod.ts",
      "fs",
    ],
  ]),
  shims: [ // Inject shims for Deno built-in
    {
      moduleSpecifier: "node-fetch",
      defaultImport: "fetch",
    },
  ],
});
```

## License

[MIT](license.txt)
