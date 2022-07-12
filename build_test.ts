import { assertEquals } from "./test_deps.ts";
import { join } from "./deps.ts";
import { main } from "./cli.ts";

Deno.test("cli.ts build <entrypoint> --dist-dir <path> -- builds the site into given path", async () => {
  const tempdir = await Deno.makeTempDir();
  assertEquals(
    await main(["build", "examples/simple/index.html", "--dist-dir", tempdir]),
    0,
  );
  assertEquals(
    await Deno.readTextFile(join(tempdir, "index.html")),
    "<!DOCTYPE html><html><head></head><body><div>aaa</div>\n</body></html>",
  );
});
