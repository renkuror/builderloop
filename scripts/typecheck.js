import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

let failed = false;
for (const file of walk(["src", "test", "scripts"])) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/from ["'](\.[^"']+)["']/g)) {
    if (!match[1].endsWith(".js")) fail(file, "relative ESM imports must include .js extension");
  }
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
