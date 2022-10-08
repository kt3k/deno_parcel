export { createHash } from "https://deno.land/std@0.155.0/hash/mod.ts";
export {
  basename,
  dirname,
  fromFileUrl,
  join,
  relative,
  resolve,
  toFileUrl,
} from "https://deno.land/std@0.155.0/path/mod.ts";
import { join } from "https://deno.land/std@0.155.0/path/posix.ts";
export { join as posixPathJoin };
export { ensureDir } from "https://deno.land/std@0.155.0/fs/ensure_dir.ts";
export { parse as parseFlags } from "https://deno.land/std@0.155.0/flags/mod.ts";
export { red } from "https://deno.land/std@0.155.0/fmt/colors.ts";
export { MuxAsyncIterator } from "https://deno.land/std@0.155.0/async/mux_async_iterator.ts";
export { walk } from "https://deno.land/std@0.155.0/fs/walk.ts";

export {
  Document,
  DOMParser,
  Element,
} from "https://deno.land/x/deno_dom@v0.1.34-alpha/deno-dom-wasm.ts";

export { opn } from "https://raw.githubusercontent.com/hashrock/deno-opn/b358e4c7df5d1c6d5e634d2730ca491ba6062782/opn.ts";
export { serve as serveIterable } from "https://deno.land/x/iterable_file_server@v0.2.0/mod.ts";

export const NAME = "packup";
export const VERSION = "v0.2.2";
