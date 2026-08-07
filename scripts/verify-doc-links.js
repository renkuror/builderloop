import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

const ROOT = process.cwd();
const IGNORED = new Set([".git", "node_modules", "target", "dist", ".anchor"]);
const markdownFiles = [];

function collect(directory) {
  for (const entry of readdirSync(directory)) {
    if (IGNORED.has(entry)) continue;
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) collect(path);
    else if (extname(path).toLowerCase() === ".md") markdownFiles.push(path);
  }
}

function localTarget(raw) {
  const trimmed = raw.trim().replace(/^<|>$/g, "");
  if (!trimmed || trimmed.startsWith("#") || /^(?:https?:|mailto:|tel:|data:)/i.test(trimmed)) return undefined;
  return trimmed.replace(/[?#].*$/, "");
}

collect(ROOT);
const failures = [];
for (const file of markdownFiles) {
  const content = readFileSync(file, "utf8");
  const links = content.matchAll(/!?\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)/g);
  for (const match of links) {
    const target = localTarget(match[1]);
    if (!target) continue;
    const resolved = target.startsWith("/") ? resolve(ROOT, `.${target}`) : resolve(dirname(file), target);
    if (!existsSync(resolved)) failures.push(`${relative(ROOT, file)} → ${target}`);
  }
}

if (failures.length > 0) throw new Error(`Broken local Markdown links:\n${failures.join("\n")}`);
console.log(JSON.stringify({ status: "verified", checkedMarkdownFiles: markdownFiles.length, localLinks: "valid" }, null, 2));
