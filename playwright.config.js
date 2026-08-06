import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "@playwright/test";

function resolveChromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE && existsSync(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE)) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  }

  // A normal `playwright install chromium` remains the portable path. This only
  // permits a local, already-installed Chromium cache when its headless shell
  // is unavailable (for example, during an interrupted download).
  const cache = process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "ms-playwright");
  if (!cache || !existsSync(cache)) return undefined;

  for (const directory of readdirSync(cache).filter((entry) => entry.startsWith("chromium-")).sort().reverse()) {
    for (const folder of ["chrome-win64", "chrome-win"]) {
      const candidate = join(cache, directory, folder, "chrome.exe");
      if (existsSync(candidate)) return candidate;
    }
  }

  return undefined;
}

const executablePath = resolveChromiumExecutable();

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  webServer: {
    command: "node scripts/serve-frontend.js",
    url: "http://127.0.0.1:4173/",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
