import { copyFileSync, mkdirSync } from "node:fs";
import { buildSync } from "esbuild";

mkdirSync("dist/web", { recursive: true });
copyFileSync("web/index.html", "dist/web/index.html");
copyFileSync("web/styles.css", "dist/web/styles.css");
buildSync({
  entryPoints: ["web/app.js"],
  bundle: true,
  format: "esm",
  outfile: "dist/web/app.js",
  platform: "browser",
  sourcemap: false
});
