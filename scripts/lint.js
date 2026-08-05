import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let failed = false;
for (const file of walk(["src", "test"])) {
  const text = readFileSync(file, "utf8");
  if (/\b(eval|Function)\s*\(/.test(text)) fail(file, "dynamic code execution is forbidden");
  if (/\bTODO\b/.test(text)) fail(file, "TODO markers must be resolved or tracked in .codex/BLOCKERS.md");
}

function* walk(paths) {
  for (const path of paths) {
    const stat = statSync(path);
    if (stat.isDirectory()) {
      for (const child of readdirSync(path)) yield* walk([join(path, child)]);
    } else if (path.endsWith(".js")) {
      yield path;
    }
  }
}

function fail(file, message) {
  console.error(`${file}: ${message}`);
  failed = true;
}

if (failed) process.exit(1);
