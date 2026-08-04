import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["src", "test", "scripts", "web", "docs", ".github"];
const exts = new Set([".js", ".md", ".json", ".yml", ".yaml", ".html", ".css"]);
let failed = false;

for (const file of walk(roots)) {
  const text = readFileSync(file, "utf8");
  if (text.includes("\r\n")) fail(file, "CRLF line endings");
  if (!text.endsWith("\n")) fail(file, "missing final newline");
}

function* walk(paths) {
  for (const path of paths) {
    try {
      const stat = statSync(path);
      if (stat.isDirectory()) {
        for (const child of readdirSync(path)) yield* walk([join(path, child)]);
      } else if (exts.has(path.slice(path.lastIndexOf(".")))) {
        yield path;
      }
    } catch {
      // Optional paths are allowed before later work packages create them.
    }
  }
}

function fail(file, message) {
  console.error(`${file}: ${message}`);
  failed = true;
}

if (failed) process.exit(1);
