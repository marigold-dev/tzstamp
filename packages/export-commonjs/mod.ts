import {
  ImportDeclarationStructure,
  OptionalKind,
  Project,
  ts,
} from "./deps.ts";

export interface ExportOptions {
  filePaths: string | string[];
  outDir: string;
  dependencyMap?: Map<string, string>;
  shims?: OptionalKind<ImportDeclarationStructure>[];
  clean?: boolean;
}

/**
 * Exports a Deno project as CommonJS.
 *
 * @param filesPaths File inclusion glob matches
 * @param outDir Directory to output files to
 * @param clean Indicates the output directory should be emptied before output
 * @param dependencyMap Dependency substitution map
 * @param shims Shim injections
 */
export async function exportCommonJS({
  filePaths,
  outDir,
  clean = true,
  dependencyMap,
  shims,
}: ExportOptions): Promise<void> {
  // Clean output directory
  if (clean) {
    await Deno.remove(outDir, { recursive: true }).catch(() => {});
    await Deno.mkdir(outDir);
  }

  // Create project
  const project = new Project({
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2019,
      outDir,
      declaration: true,
      sourceMap: false,
      noEmitOnError: true,
      strict: true,
    },
  });

  project.addSourceFilesAtPaths(filePaths);

  // Map import and export declarations
  for (const sourceFile of project.getSourceFiles()) {
    const declarations = [
      ...sourceFile.getImportDeclarations(),
      ...sourceFile.getExportDeclarations(),
    ];
    for (const declaration of declarations) {
      const specifier = declaration.getModuleSpecifierValue();
      if (!specifier) continue;
      if (dependencyMap?.has(specifier)) {
        declaration.setModuleSpecifier(
          dependencyMap.get(specifier) as string,
        );
      } else if (specifier.endsWith(".ts")) {
        declaration.setModuleSpecifier(
          specifier.slice(0, -3).concat(".js"),
        );
      }
    }
    if (shims) {
      sourceFile.addImportDeclarations(shims);
    }
  }

  // Emit files
  const emitResult = project.emitToMemory();
  await emitResult.saveFiles();

  // Diagnose
  const diagnostics = [
    ...project.getPreEmitDiagnostics(),
    ...emitResult.getDiagnostics(),
  ];
  if (diagnostics.length) {
    console.error(
      project.formatDiagnosticsWithColorAndContext(diagnostics),
    );
    Deno.exit(1);
  }
}
