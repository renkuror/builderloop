import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("dist/web", { recursive: true });
copyFileSync("web/index.html", "dist/web/index.html");
copyFileSync("web/styles.css", "dist/web/styles.css");
copyFileSync("web/app.js", "dist/web/app.js");
