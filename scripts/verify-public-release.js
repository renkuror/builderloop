import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

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

const deployment = JSON.parse(readFileSync("deployments/devnet.json", "utf8"));
const evidence = JSON.parse(readFileSync("evidence/devnet-addresses.json", "utf8"));
const transactions = JSON.parse(readFileSync("evidence/transaction-links.json", "utf8"));
const documentationFiles = ["README.md", "DEVNET_RELEASE_REPORT.md", "PUBLIC_RELEASE_AUDIT.md", "docs/VERCEL_DEPLOY.md", "FINAL_REPORT.md"];
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
let publicConfig;
try {
  const match = config.match(/Object\.freeze\(([\s\S]+)\);\s*$/);
  publicConfig = match ? JSON.parse(match[1]) : undefined;
} catch {
  publicConfig = undefined;
}
const demo = deployment.demo;
const securityFailures = [
  ["missing LIVE DEVNET label", !app.includes("LIVE DEVNET")],
  ["missing Mechanical Manga headline", !app.includes("Points cannot substitute for return.")],
  ["missing live Devnet flag", !config.includes('"live":true')],
  ["missing Devnet RPC", !config.includes("https://api.devnet.solana.com")],
  ["mainnet RPC or cluster exposed", /(mainnet-beta|api\.mainnet)/i.test(config)],
  ["deployment placeholder exposed", [app, config].some((body) => body.includes("YOUR_VERCEL_URL"))],
  ["private material exposed", [app, config].some((body) => secretPatterns.some((pattern) => pattern.test(body)))],
  ["public config is not parseable", !publicConfig],
  ["public config is not live Devnet", publicConfig?.cluster !== "devnet" || publicConfig?.live !== true],
  ["public BuilderLoop ID differs from audited deployment", publicConfig?.builderloopProgramId !== deployment.programs.builderloop.address],
  ["public CohortBuild ID differs from audited deployment", publicConfig?.cohortBuildProgramId !== deployment.programs.cohortBuild.address],
  ["public Campaign differs from audited demo", publicConfig?.demo?.campaign !== demo.campaign],
  ["public Reward differs from audited demo", publicConfig?.demo?.reward !== demo.reward],
  ["public UserProgress differs from audited demo", publicConfig?.demo?.userProgress !== demo.userProgress],
  ["public demo proof inventory differs from audited evidence", ["moduleFinalization", "nativeCpiShip", "rewardClaimed"].some((name) => publicConfig?.demo?.transactions?.[name]?.signature !== demo.transactions[name].signature)],
].filter(([, failed]) => failed);
const linkFailures = explorerResults.filter(({ status, url }) => status < 200 || status >= 300 || !url.endsWith("?cluster=devnet"));
const documentationLinks = documentationFiles.flatMap((file) => {
  const text = readFileSync(file, "utf8");
  return [...text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map(([, rawTarget]) => ({
    file,
    target: rawTarget.split("#")[0].trim(),
  }));
});
const documentationFailures = documentationLinks.filter(({ file, target }) => {
  if (!target || /^(?:https?:|mailto:)/i.test(target)) return false;
  return !existsSync(resolve(dirname(file), target));
});

const result = {
  status: htmlFailures.length || assetFailures.length || securityFailures.length || linkFailures.length || documentationFailures.length ? "failed" : "verified",
  productionUrl: baseUrl,
  routes: routeResults.map(({ path, status }) => ({ path, status })),
  assets: assetResults.map(({ path, status }) => ({ path, status })),
  explorerLinks: { checked: explorerResults.length, failures: linkFailures },
  documentationLinks: { checked: documentationLinks.length, failures: documentationFailures },
  failures: {
    routes: htmlFailures.map(({ path, status }) => ({ path, status })),
    assets: assetFailures.map(({ path, status }) => ({ path, status })),
    security: securityFailures.map(([name]) => name),
    documentation: documentationFailures,
  },
};

console.log(JSON.stringify(result, null, 2));
if (result.status !== "verified") process.exit(1);
