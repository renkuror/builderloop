import { readFileSync } from "node:fs";

const baseUrl = (process.env.PUBLIC_FRONTEND_URL ?? "https://builderloop-tan.vercel.app").replace(/\/$/, "");
const routes = ["/", "/demo/", "/campaign/", "/progress/", "/reward/", "/architecture/", "/evidence/"];
const assets = ["/app.js", "/styles.css", "/devnet-config.js"];
const secretPatterns = [
  /-----BEGIN (?:RSA|OPENSSH|EC|DSA|PRIVATE) KEY-----/,
  /github_pat_[A-Za-z0-9_]+/,
  /gh[pousr]_[A-Za-z0-9_]+/,
  /sk-[A-Za-z0-9]{20,}/,
  /xox[baprs]-[A-Za-z0-9-]+/,
];

const evidence = JSON.parse(readFileSync("evidence/devnet-addresses.json", "utf8"));
const transactions = JSON.parse(readFileSync("evidence/transaction-links.json", "utf8"));
const explorerUrls = [
  ...Object.values(evidence.programs).flatMap(({ explorerUrl, deploymentExplorerUrl }) => [explorerUrl, deploymentExplorerUrl]),
  ...Object.values(evidence.addresses).map(({ explorerUrl }) => explorerUrl),
  ...Object.values(transactions.transactions).map(({ explorerUrl }) => explorerUrl),
];

async function fetchChecked(path) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "follow" });
  return { path, status: response.status, url: response.url, body: await response.text() };
}

const routeResults = await Promise.all(routes.map(fetchChecked));
const assetResults = await Promise.all(assets.map(fetchChecked));
const explorerResults = await Promise.all([...new Set(explorerUrls)].map(async (url) => {
  const response = await fetch(url, { redirect: "follow" });
  return { url, status: response.status, finalUrl: response.url };
}));

const htmlFailures = routeResults.filter(({ status, body }) => status !== 200 || !body.includes('id="app"'));
const assetFailures = assetResults.filter(({ status }) => status !== 200);
const [app, , config] = assetResults.map(({ body }) => body);
const securityFailures = [
  ["missing LIVE DEVNET label", !app.includes("LIVE DEVNET")],
  ["missing Mechanical Manga headline", !app.includes("Points cannot substitute for return.")],
  ["missing live Devnet flag", !config.includes('"live":true')],
  ["missing Devnet RPC", !config.includes("https://api.devnet.solana.com")],
  ["mainnet RPC or cluster exposed", /(mainnet-beta|api\.mainnet)/i.test(config)],
  ["deployment placeholder exposed", [app, config].some((body) => body.includes("YOUR_VERCEL_URL"))],
  ["private material exposed", [app, config].some((body) => secretPatterns.some((pattern) => pattern.test(body)))],
].filter(([, failed]) => failed);
const linkFailures = explorerResults.filter(({ status, url }) => status < 200 || status >= 300 || !url.endsWith("?cluster=devnet"));

const result = {
  status: htmlFailures.length || assetFailures.length || securityFailures.length || linkFailures.length ? "failed" : "verified",
  productionUrl: baseUrl,
  routes: routeResults.map(({ path, status }) => ({ path, status })),
  assets: assetResults.map(({ path, status }) => ({ path, status })),
  explorerLinks: { checked: explorerResults.length, failures: linkFailures },
  failures: {
    routes: htmlFailures.map(({ path, status }) => ({ path, status })),
    assets: assetFailures.map(({ path, status }) => ({ path, status })),
    security: securityFailures.map(([name]) => name),
  },
};

console.log(JSON.stringify(result, null, 2));
if (result.status !== "verified") process.exit(1);
