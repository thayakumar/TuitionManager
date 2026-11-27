#!/usr/bin/env node
// Validate Review Quest content files.
// Usage: node scripts/validate-review.cjs lib/review/content/form1/ch2a.ts [...more]
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const cache = new Map();
function load(file) {
  const filename = path.resolve(root, file);
  if (cache.has(filename)) return cache.get(filename).exports;
  const m = new Module(filename, module);
  m.filename = filename;
  m.paths = Module._nodeModulePaths(root);
  cache.set(filename, m);
  const original = m.require.bind(m);
  m.require = (name) => {
    if (name.startsWith(".") || name.startsWith("@/")) {
      const base = name.startsWith("@/") ? path.resolve(root, name.slice(2)) : path.resolve(path.dirname(filename), name);
      for (const candidate of [base + ".ts", path.join(base, "index.ts")]) if (fs.existsSync(candidate)) return load(candidate);
    }
    return original(name);
  };
  m._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText,
    filename,
  );
  return m.exports;
}
const { validateCheckpoints, estimateSeconds } = load("lib/review/validate.ts");
const files = process.argv.slice(2);
if (!files.length) {
  console.error("Pass one or more content files.");
  process.exit(2);
}
let failed = false;
const seen = new Set();
for (const file of files) {
  const mod = load(file);
  if (!Array.isArray(mod.checkpoints) || typeof mod.misconceptions !== "object") {
    console.error(`${file}: must export \`checkpoints\` (Checkpoint[]) and \`misconceptions\` (Record<string,string>)`);
    failed = true;
    continue;
  }
  const errors = validateCheckpoints(mod.checkpoints, mod.misconceptions, seen);
  for (const cp of mod.checkpoints)
    console.log(`${cp.id.padEnd(12)} ${String(cp.game).padEnd(18)} pool=${String(cp.items.length).padStart(2)} draw=${String(cp.draw).padStart(2)} ~${estimateSeconds(cp)}s`);
  if (errors.length) {
    failed = true;
    console.error(`\n${file}: ${errors.length} problem(s)`);
    for (const e of errors) console.error("  - " + e);
  } else console.log(`${file}: OK`);
}
process.exit(failed ? 1 : 0);
