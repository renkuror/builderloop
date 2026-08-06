import { copyFileSync, cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { buildSync } from "esbuild";

const entryPoint = resolve("web", "app.js");
const outputFile = resolve("dist", "web", "app.js");

mkdirSync("dist/web", { recursive: true });
copyFileSync("web/index.html", "dist/web/index.html");
copyFileSync("web/styles.css", "dist/web/styles.css");
for (const route of ["demo", "campaign", "progress", "reward", "architecture", "evidence"]) {
  mkdirSync(`dist/web/${route}`, { recursive: true });
  copyFileSync("web/index.html", `dist/web/${route}/index.html`);
}
if (existsSync("docs/assets/frontend")) cpSync("docs/assets/frontend", "dist/web/assets/frontend", { recursive: true });
buildSync({
  entryPoints: [entryPoint],
  bundle: true,
  format: "esm",
  outfile: outputFile,
  platform: "browser",
  sourcemap: false
});
