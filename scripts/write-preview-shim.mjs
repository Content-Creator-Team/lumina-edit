import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const nitroEntry = join(root, ".output", "server", "index.mjs");
if (!existsSync(nitroEntry)) {
  console.warn("[preview-shim] .output/server/index.mjs missing — run vite build first");
  process.exit(0);
}

const shimDir = join(root, "dist", "server");
mkdirSync(shimDir, { recursive: true });

let specifier = relative(shimDir, nitroEntry).split("\\").join("/");
if (!specifier.startsWith(".")) specifier = `./${specifier}`;

writeFileSync(
  join(shimDir, "server.js"),
  `// Generated for vite preview - re-exports Nitro server entry.
import server from "${specifier}";

const env = {};
const ctx = { waitUntil() {}, passThroughOnException() {}, props: {} };

export default {
  fetch(request) {
    Object.defineProperty(request, "ip", { value: undefined, writable: true, configurable: true });
    return server.fetch(request, env, ctx);
  },
};
`,
  "utf8",
);

console.log("[preview-shim] wrote dist/server/server.js →", specifier);
