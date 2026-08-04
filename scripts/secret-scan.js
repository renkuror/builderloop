import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const patterns = [
  /github_pat_[A-Za-z0-9_]+/,
  /gh[pousr]_[A-Za-z0-9_]+/,
  /sk-[A-Za-z0-9]{20,}/,
  /xox[baprs]-[A-Za-z0-9-]+/,
  /BEGIN (RSA|OPENSSH|EC|DSA|PRIVATE) KEY/,
  /(api[_-]?key|secret|password|mnemonic|seed phrase)\s*[:=]\s*['"][^'"]+['"]/i
];
let failed = false;

for (const file of walk(["."])) {
  const text = readFileSync(file, "utf8");
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      console.error(`${file}: possible secret matched ${pattern}`);
      failed = true;
    }
  }
}

function* walk(paths) {
  for (const path of paths) {
    if (path.includes("node_modules") || path.includes(".git") || path.includes("dist")) continue;
    const stat = statSync(path);
    if (stat.isDirectory()) {
      for (const child of readdirSync(path)) yield* walk([join(path, child)]);
    } else if (stat.size < 1_000_000) {
      yield path;
    }
  }
}

if (failed) process.exit(1);
