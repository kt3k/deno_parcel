import { assert, assertEquals, assertStringIncludes } from "./test_deps.ts";
import { bundleByEsbuild, getImportMap, setImportMap } from "./bundle_util.ts";

Deno.test("bundleByEsbuild - bundles the script by esbuild", async () => {
  const bundle = await bundleByEsbuild("testdata/foo.js", { noBundle: false });

  assertStringIncludes(bundle, `console.log("hi");`);
});

Deno.test("bundleByEsbuild - builds without bundling the script by esbuild", async () => {
  const bundle = await bundleByEsbuild("testdata/foo.js", { noBundle: true });

  assert(!bundle.includes(`console.log("hi");`) && bundle.includes("bar.js"));
});

Deno.test(
  "setImportMap + getImportMap - stores import map for build process",
  () => {
    const importMapFile = "./import_map.json";
    assertEquals(getImportMap(), undefined);
    setImportMap(importMapFile);
    assertEquals(getImportMap(), importMapFile);
  },
);
