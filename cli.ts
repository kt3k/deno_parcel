import {
  ensureDir,
  join,
  NAME,
  opn,
  parseFlags,
  red,
  VERSION,
} from "./deps.ts";
import { serveIterable } from "./unstable_deps.ts";
import { generateAssets, watchAndGenAssets } from "./generate_assets.ts";
import {
  generateStaticAssets,
  watchAndGenStaticAssets,
} from "./generate_static_assets.ts";
import { livereloadServer } from "./livereload_server.ts";
import { byteSize, mux } from "./util.ts";
import { logger, setLogLevel } from "./logger_util.ts";

function usage() {
  logger.log(`
Usage: ${NAME} <command> [options]

Options:
  -v, --version               Output the version number
  -h, --help                  Output usage information

Commands:
  serve [options] <input...>  Starts a development server
  build [options] <input...>  Bundles for production
  help <command>              Displays help information for a command

  Run '${NAME} help <command>' for more information on specific commands
`.trim());
}

function usageServe() {
  logger.log(`
Usage: ${NAME} serve [options] <input...>

Starts a development server

Options:
  -p, --port <port>               Sets the port to serve on. Default is 1234.
  --livereload-port               Sets the port for live reloading. Default is 35729.
  -s, --static-dir <dir>          The directory for static files. The files here are served as is.
  -o, --open                      Automatically opens in specified browser.
  TODO --public-url <url>         The path prefix for absolute urls.
  TODO --https                    Serves files over HTTPS.
  TODO --cert <path>              The path to certificate to use with HTTPS.
  TODO --key <path>               The path to private key to use with HTTPS.
  --log-level <level>             Sets the log level. "error", "warn", "info", "debug" or "trace". Default is "info".
  -h, --help                      Displays help for command.
`.trim());
}

function usageBuild() {
  logger.log(`
Usage: ${NAME} build [options] <input...>

bundles for production

Options:
  --dist-dir <dir>                Output directory to write to when unspecified by targets
  -s, --static-dir <dir>          The directory for static files. The files here are copied to dist as is.
  TODO --public-url <url>         The path prefix for absolute urls
  -L, --log-level <level>         Set the log level (choices: "none", "error", "warn", "info", "verbose")
  -h, --help                      Display help for command
`.trim());
}

type CliArgs = {
  _: string[];
  version: boolean;
  help: boolean;
  "dist-dir": string;
  "log-level": "error" | "warn" | "info" | "debug" | "trace";
  "livereload-port": string;
  open: boolean;
  port: string;
  "static-dir": string;
};

/**
 * The entrypoint
 */
export async function main(cliArgs: string[] = Deno.args): Promise<number> {
  const {
    _: args,
    version,
    help,
    "dist-dir": distDir = "dist",
    "static-dir": staticDir = "static",
    "log-level": logLevel = "info",
    open = false,
    port = "1234",
    "livereload-port": livereloadPort = 35729,
  } = parseFlags(cliArgs, {
    string: ["log-level", "out-dir", "port", "static-dir"],
    boolean: ["help", "version", "open"],
    alias: {
      h: "help",
      v: "version",
      o: "open",
      s: "static-dir",
      L: "log-level",
    },
  }) as CliArgs;

  setLogLevel(logLevel);

  if (version) {
    logger.log(NAME, VERSION);
    return 0;
  }

  const command = args[0];

  if (help) {
    if (command) {
      switch (command) {
        case "build":
          usageBuild();
          return 0;
        case "serve":
          usageServe();
          return 0;
        default:
          logger.error("Error: Command not found:", command);
          usage();
          return 1;
      }
    }
    usage();
    return 0;
  }

  if (!command) {
    usage();
    return 1;
  }

  if (command === "help") {
    const subcommand = args[1];
    if (!subcommand) {
      usage();
      return 0;
    }
    if (subcommand === "build") {
      usageBuild();
      return 0;
    }
    if (subcommand === "serve") {
      usageServe();
      return 0;
    }
    logger.error(`${red("Error")}: Command '${subcommand}' not found`);
    usage();
    return 1;
  }

  if (command === "build") {
    const entrypoint = args[1];
    if (!entrypoint) {
      usageBuild();
      return 1;
    }
    await build(entrypoint, { distDir, staticDir });
    return 0;
  }

  let entrypoint: string;
  if (command === "serve") {
    // packup serve <entrypoint>
    entrypoint = args[1];
  } else {
    // Suppose command is implicitly 'serve' and args[0] is the entrypoint
    // packup <entrypoint>
    entrypoint = args[0];
  }

  if (!entrypoint) {
    usageServe();
    return 1;
  }

  await serve(entrypoint, {
    open,
    port: +port,
    livereloadPort: +livereloadPort,
    staticDir,
  });
  return 0;
}

type BuildAndServeCommonOptions = {
  staticDir: string;
};

type BuildOptions = {
  distDir: string;
};

/**
 * The build command
 */
async function build(
  path: string,
  { distDir, staticDir }: BuildOptions & BuildAndServeCommonOptions,
) {
  logger.log(`Writing the assets to ${distDir}`);
  await ensureDir(distDir);

  const staticAssets = generateStaticAssets(staticDir);
  const [assets] = await generateAssets(path, {});

  // TODO(kt3k): Use pooledMap-like thing
  for await (const asset of mux(staticAssets, assets)) {
    const filename = join(distDir, asset.name);
    const bytes = new Uint8Array(await asset.arrayBuffer());
    // TODO(kt3k): Print more structured report
    logger.log("Writing", filename, byteSize(bytes.byteLength));
    await Deno.writeFile(filename, bytes);
  }
}

type ServeOptions = {
  open: boolean;
  port: number;
  livereloadPort: number;
};

/**
 * The serve command
 */
async function serve(
  path: string,
  { open, port, livereloadPort, staticDir }:
    & ServeOptions
    & BuildAndServeCommonOptions,
) {
  // This is used for propagating onBuild event to livereload server.
  const buildEventHub = new EventTarget();
  livereloadServer(livereloadPort, buildEventHub);
  if (open) {
    // Opens browser at the end of the first build
    buildEventHub.addEventListener("built", () => {
      opn(`http://localhost:${port}`);
    }, { once: true });
  }
  const onBuild = () => buildEventHub.dispatchEvent(new CustomEvent("built"));

  const assets = watchAndGenAssets(path, {
    livereloadPort,
    onBuild,
    mainAs404: true,
  });
  const staticAssets = watchAndGenStaticAssets(staticDir);

  const { addr } = serveIterable(mux(assets, staticAssets), { port });
  if (addr.transport === "tcp") {
    logger.log(`Server running at http://localhost:${addr.port}`);
  }
  await new Promise(() => {});
}

if (import.meta.main) {
  Deno.exit(await main());
}
