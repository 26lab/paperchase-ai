// Bundles the Electron main/preload scripts and the MCP server into dist-electron/.
// Everything is bundled, so the packaged app ships without node_modules.
import { build } from "esbuild";

const watch = process.argv.includes("--watch");
const common = { bundle: true, platform: "node", target: "node22", sourcemap: true, logLevel: "info", external: ["electron"] };

const targets = [
  { ...common, entryPoints: ["electron/main.ts"], outfile: "dist-electron/main.js", format: "cjs" },
  { ...common, entryPoints: ["electron/preload.ts"], outfile: "dist-electron/preload.js", format: "cjs" },
  // ESM because the server uses top-level await; run with ELECTRON_RUN_AS_NODE=1.
  { ...common, entryPoints: ["mcp/server.ts"], outfile: "dist-electron/mcp.mjs", format: "esm" },
];

if (watch) {
  const { context } = await import("esbuild");
  await Promise.all(targets.map(async (options) => (await context(options)).watch()));
} else {
  await Promise.all(targets.map((options) => build(options)));
}
