import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Buffer } from "buffer";
import {
  EVIDENCE,
  FLOW_SCENARIOS,
  ROUTES,
  createKeyButton,
  createSoundController,
  createTransactionFlow,
  friendlyProgramError,
  getScenario,
} from "./ui.js";

const PUBLIC_CONFIG = globalThis.BUILDERLOOP_PUBLIC_CONFIG ?? {
  cluster: "devnet",
  rpcUrl: "https://api.devnet.solana.com",
  live: false,
  builderloopProgramId: EVIDENCE.program,
  cohortBuildProgramId: EVIDENCE.cohortBuild,
  demo: null,
};
const PROGRAM_ID = new PublicKey(PUBLIC_CONFIG.builderloopProgramId);
const COHORT_BUILD_ID = new PublicKey(PUBLIC_CONFIG.cohortBuildProgramId);
const DEVNET_GENESIS_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
const DEMO = PUBLIC_CONFIG.demo;
const LIVE_DEVNET = PUBLIC_CONFIG.cluster === "devnet" && PUBLIC_CONFIG.live === true && DEMO !== null;
const app = document.querySelector("#app");
const sound = createSoundController();
const live = {
  wallet: undefined,
  connection: undefined,
  campaign: undefined,
  progress: undefined,
  reward: undefined,
  demoProgress: undefined,
  configuredState: "idle",
  configuredError: undefined,
};
const state = {
  scenario: new URLSearchParams(window.location.search).get("scenario") ?? "shipped",
  selectedStage: "return",
};
const stages = ["Initialized", "ModulePending", "ModuleFinalized", "Shipped"];
const campaignStatuses = ["Draft", "Frozen", "Active", "Finalized"];
const rewardStatuses = ["Draft", "Funded", "Active", "Paused", "Ended", "Closed"];
const discriminators = {
  campaign: [37, 60, 103, 198, 105, 149, 26, 142],
  progress: [195, 16, 25, 215, 192, 49, 107, 204],
  reward: [174, 129, 42, 212, 190, 18, 45, 34],
};

const $ = (selector) => document.querySelector(selector);
const code = (value) => `<code>${value}</code>`;
const link = (url, label) => `<a class="key-button compact secondary external-key" href="${url}" target="_blank" rel="noreferrer">${label}<span aria-hidden="true"> ↗</span></a>`;
const panel = (id, title, body, extraClass = "") => `<section class="technical-panel ${extraClass}" aria-labelledby="${id}"><p class="panel-kicker">${id.toUpperCase()}</p><h2 id="${id}">${title}</h2>${body}</section>`;
const explorerAddress = (address) => `https://explorer.solana.com/address/${address}?cluster=devnet`;
const explorerTransaction = (signature) => `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

function devnetLabel(scenario) {
  return LIVE_DEVNET ? "LIVE DEVNET" : scenario.networkLabel;
}

function stageName(progress = live.demoProgress ?? live.progress) {
  return progress ? (stages[progress.stage] ?? "Unknown") : "Loading";
}

function rewardStateName(reward = live.reward) {
  return reward ? (rewardStatuses[reward.status] ?? "Unknown") : "Loading";
}

function normalisedPath() {
  const path = window.location.pathname.replace(/\/index\.html$/, "").replace(/\/$/, "");
  return path || "/";
}

function currentRoute() {
  return ROUTES.find((route) => route.path === normalisedPath()) ?? ROUTES[0];
}

function routeHref(path) {
  return path === "/" ? "/" : `${path}/`;
}

function keyClass(stage) {
  return `key-button rail-stage state-${stage.state}`;
}

function keyboardArt() {
  return `<div class="keyboard-art" aria-hidden="true">
    <svg viewBox="0 0 760 470" focusable="false">
      <g class="art-grid"><path d="M25 55H735M25 145H735M25 235H735M25 325H735M25 415H735M90 20V450M230 20V450M370 20V450M510 20V450M650 20V450" /></g>
      <g class="art-outline"><path d="M70 125 155 80h382l140 67-64 227H149z" /><path d="M153 374h455" /><path d="M120 410h470" /></g>
      <g class="art-key"><rect x="136" y="145" width="83" height="64" /><rect x="230" y="133" width="83" height="64" /><rect x="324" y="121" width="83" height="64" /><rect x="418" y="133" width="83" height="64" /><rect x="512" y="145" width="83" height="64" /><rect x="174" y="220" width="115" height="70" /><rect x="302" y="210" width="156" height="70" /><rect x="471" y="220" width="92" height="70" /></g>
      <g class="art-ink"><path d="M96 92 42 49M633 105l76-44M596 343l92 23M135 347 58 384" /><circle cx="61" cy="48" r="6" /><circle cx="710" cy="60" r="6" /><circle cx="690" cy="366" r="6" /><circle cx="57" cy="385" r="6" /></g>
      <g class="art-type"><text x="95" y="45">RETURN / INPUT</text><text x="618" y="47">LOCKED LOOP</text><text x="122" y="448">MODULE</text><text x="595" y="448">REWARD</text><text x="344" y="260">CLACK!</text></g>
    </svg>
  </div>`;
}

function renderHeader(route, scenario) {
  const nav = ROUTES.map((item) => `<a class="key-button navigation ${item.path === route.path ? "is-active" : ""}" href="${routeHref(item.path)}" ${item.path === route.path ? 'aria-current="page"' : ""}>${item.label}</a>`).join("");
  return `<header class="site-header"><a class="wordmark" href="/" aria-label="BuilderLoop overview">BUILDER<span>LOOP</span><small>BL / RETURN INSTRUMENT</small></a><nav class="route-nav" aria-label="BuilderLoop pages">${nav}</nav><div class="header-tools"><span class="network-label" data-network="${LIVE_DEVNET ? "devnet" : "fixture"}">${devnetLabel(scenario)}</span><span id="sound-toggle"></span></div></header>`;
}

function renderReturnRail(scenario) {
  const demoProgress = live.demoProgress;
  const shipped = demoProgress?.stage === 3;
  const claimed = live.reward?.claimed === live.reward?.maxClaims && live.reward?.maxClaims > 0;
  const rail = LIVE_DEVNET ? [
    { id: "module", number: "01", label: "MODULE", state: demoProgress?.stage >= 2 ? "finalized" : "loading", proof: "Devnet ModuleReceipt is refetched from the configured BuilderLoop program." },
    { id: "return", number: "02", label: "RETURN GATE", state: shipped ? "satisfied" : "loading", proof: "The released DEMO CONFIGURATION uses a real Solana Clock gate: 2 seconds and one 2-second period." },
    { id: "ship", number: "03", label: "SHIP", state: shipped ? "shipped" : "loading", proof: "CohortBuild Completion reached BuilderLoop through the native CPI transaction recorded in public evidence." },
    { id: "reward", number: "04", label: "REWARD", state: claimed ? "claimed" : rewardStateName().toLowerCase(), proof: "Reward and Claim state are read from Devnet accounts; the fixed amount is never supplied by the claimant." },
  ] : scenario.rail;
  const selected = rail.find((stage) => stage.id === state.selectedStage) ?? rail[1];
  const status = LIVE_DEVNET ? (shipped ? (claimed ? "CLAIMED" : "SHIPPED") : "LOADING") : scenario.statusLabel;
  const evidence = LIVE_DEVNET ? `Devnet state: UserProgress ${stageName()} · Reward ${rewardStateName()}. ${live.configuredError ?? ""}` : scenario.reason;
  return `<section class="return-rail technical-panel" aria-labelledby="return-rail-title"><div class="section-heading"><div><p class="panel-kicker">BL_04 / ORDERED RETURN</p><h2 id="return-rail-title">Return Rail</h2></div><span class="status-chip" data-state="${rail.at(-1).state}">${status}</span></div><div class="rail-stages" role="group" aria-label="Open proof detail for each return stage">${rail.map((stage) => `<button class="${keyClass(stage)} ${stage.id === selected.id ? "is-selected" : ""}" type="button" data-action="select-stage" data-stage="${stage.id}" data-state="${stage.state}" aria-pressed="${stage.id === selected.id}"><span>${stage.number}</span><strong>${stage.label}</strong><em>${stage.state}</em></button>`).join("")}</div><div id="proof-drawer" class="proof-drawer" tabindex="-1"><p class="panel-kicker">PROOF DRAWER / ${selected.number}</p><h3>${selected.label} <span class="state-line" data-state="${selected.state}">${selected.state}</span></h3><p>${selected.proof}</p><p><strong>${LIVE_DEVNET ? "Devnet account interpretation" : "Fixture interpretation"}:</strong> ${evidence}</p><details><summary>Raw evidence or error detail</summary>${code(LIVE_DEVNET ? `Campaign ${DEMO.campaign}; Program ${PROGRAM_ID.toBase58()}; RPC ${PUBLIC_CONFIG.rpcUrl}` : scenario.rawError)}</details></div></section>`;
}

function renderHero() {
  const note = LIVE_DEVNET ? "One fixed Devnet DEMO CONFIGURATION. The verifier and source semantics are disclosed trust boundaries; this is not a claim of Sybil resistance or independent sponsorship." : "One fixed localnet campaign. The verifier and source semantics are disclosed trust boundaries; this is not a claim of Sybil resistance or independent sponsorship.";
  return `<section class="hero"><div class="hero-copy"><p class="panel-kicker">BUILDERLOOP / ORDERED RETURN REWARDS FOR SOLANA COHORTS</p><h1>Points cannot substitute for return.</h1><p class="hero-lede">BuilderLoop freezes an ordered Module → Return Later → Ship path on-chain, then releases a pre-funded fixed reward only after the same wallet returns through the campaign-defined gate.</p><div class="key-row"><a class="key-button primary" href="/demo/">OPEN JUDGE DEMO</a><a class="key-button secondary" href="/evidence/">VIEW EVIDENCE</a>${link("https://github.com/renkuror/builderloop", "GitHub")}</div><p class="trust-note">${note}</p></div>${keyboardArt()}</section>`;
}

function renderComparison() {
  return `<section class="comparison-grid" aria-label="Manual flow compared with BuilderLoop"><article class="technical-panel"><p class="panel-kicker">BL_05 / MANUAL</p><h2>Activity looks alike</h2><ol class="manual-list"><li>Issue a generic task.</li><li>Collect one-off proof.</li><li>Credit points without a return gate.</li><li>Rely on an operator to reconcile rewards.</li></ol></article><article class="technical-panel emphasis-panel"><p class="panel-kicker">BL_06 / BUILDERLOOP</p><h2>Progression must be ordered</h2><ol class="manual-list"><li>Verifier attests a frozen Module event.</li><li>Clock and discrete periods enforce return.</li><li>Same wallet completes the committed project.</li><li>Reward vault settles a fixed claim once.</li></ol></article></section>`;
}

function renderOverview(scenario) {
  const trust = LIVE_DEVNET
    ? `<div class="detail-grid"><div><h3>Enforced on Devnet</h3><p>Frozen eligibility fields, pending receipt, wallet/project binding, real Clock gates, native CPI Ship, and fixed classic-SPL settlement are live account state.</p></div><div><h3>Disclosed trust boundary</h3><p>This is a clearly labeled DEMO CONFIGURATION. It is not a claim of Sybil resistance, independent sponsorship, or organic retention.</p></div></div>`
    : `<div class="detail-grid"><div><h3>Enforced on localnet</h3><p>Frozen eligibility fields, verifier epoch, pending receipt, wallet/project binding, source account checks, time/period gates, native CPI Ship, and fixed SPL settlement.</p></div><div><h3>Disclosed trust boundary</h3><p>The campaign authority configures before freeze; the verifier and CohortBuild source carry defined authority. Devnet evidence is not produced.</p></div></div>`;
  return `${renderHero()}${renderReturnRail(scenario)}${renderComparison()}${panel("trust-disclosure", "What is enforced, and what is disclosed", trust)}`;
}

function scenarioControls(scenario) {
  return `<div class="scenario-controls" role="group" aria-label="Choose a prepared demo state">${FLOW_SCENARIOS.map((item) => `<button type="button" class="key-button compact ${item.id === scenario.id ? "success" : "secondary"}" data-action="set-scenario" data-scenario="${item.id}" aria-pressed="${item.id === scenario.id}">${item.label}</button>`).join("")}</div>`;
}

function renderDemo(scenario) {
  if (LIVE_DEVNET) {
    return `${panel("judge-demo", "Public Devnet proof path", `<p class="intro-copy">${DEMO.label}. These are real Devnet accounts, not a fixture. The short gates exist only for this public demonstration.</p><div class="detail-grid"><div><span class="metric-label">Campaign return rule</span><strong>${DEMO.timing.minimumElapsedSeconds} seconds + ${DEMO.timing.minimumPeriodGap} × ${DEMO.timing.periodSeconds}-second period</strong><p>Module finalization and Ship were separate Devnet transactions.</p></div><div><span class="metric-label">Verified account state</span><strong>${stageName()}</strong><p>Reward: ${rewardStateName()}.</p></div></div>`) }${renderReturnRail(scenario)}${panel("devnet-proof", "Public proof inventory", `<dl class="proof-list"><dt>Campaign</dt><dd>${code(DEMO.campaign)} ${link(explorerAddress(DEMO.campaign), "EXPLORER")}</dd><dt>Module finalization</dt><dd>${link(DEMO.transactions.moduleFinalization.explorerUrl, "VIEW TX")}</dd><dt>Completion / native Ship</dt><dd>${link(DEMO.transactions.nativeCpiShip.explorerUrl, "VIEW TX")}</dd><dt>Fixed SPL Reward Claim</dt><dd>${link(DEMO.transactions.rewardClaimed.explorerUrl, "VIEW TX")}</dd><dt>Program IDs</dt><dd>BuilderLoop ${code(PROGRAM_ID.toBase58())} ${link(explorerAddress(PROGRAM_ID.toBase58()), "EXPLORER")} CohortBuild ${code(COHORT_BUILD_ID.toBase58())} ${link(explorerAddress(COHORT_BUILD_ID.toBase58()), "EXPLORER")}</dd></dl><p class="trust-note">Each link is a genuine Devnet account or finalized transaction. The SPL test mint has no implied value.</p>`)}`;
  }
  return `${panel("judge-demo", "Prepared proof path — no wallet required", `<p class="intro-copy">This is a deterministic read-only representation of the localnet scenario. It exposes the actual frozen identifiers and account model without inventing a live transaction or explorer link.</p>${scenarioControls(scenario)}<div class="detail-grid"><div><span class="metric-label">Campaign return rule</span><strong>120 seconds + 2 × 60-second periods</strong><p>Module must be finalized before Ship.</p></div><div><span class="metric-label">Prepared state</span><strong>${scenario.stage}</strong><p>${scenario.earliestShip}</p></div></div>`) }${renderReturnRail(scenario)}`;
}

function renderCampaign() {
  if (LIVE_DEVNET) {
    const campaign = live.campaign;
    const detail = campaign ? `<dl class="proof-list"><dt>Campaign</dt><dd>${code(campaign.address.toBase58())} ${link(explorerAddress(campaign.address.toBase58()), "EXPLORER")}</dd><dt>Status</dt><dd>${campaignStatuses[campaign.status] ?? "Unknown"} · actions ${campaign.paused ? "paused" : "unpaused"}</dd><dt>Verifier / epoch</dt><dd>${code(campaign.verifier.toBase58())} · epoch ${campaign.verifierEpoch} · ${campaign.verifierActive ? "active" : "inactive"}</dd><dt>Reward authority</dt><dd>${code(campaign.rewardAuthority.toBase58())}</dd><dt>Source program / authority</dt><dd>${code(campaign.sourceProgram.toBase58())} / ${code(campaign.sourceAuthority.toBase58())}</dd><dt>Challenge ID</dt><dd>${campaign.challengeId.toString()}</dd><dt>Return gate</dt><dd>${campaign.minElapsedSeconds} seconds and ${campaign.minPeriodGap} period(s) of ${campaign.periodSeconds} seconds.</dd><dt>Frozen config hash</dt><dd>${code(hex(campaign.configHash))}</dd></dl>` : `<p class="transaction-state">${live.configuredState === "failed" ? live.configuredError : "Loading configured Devnet Campaign…"}</p>`;
    return `${panel("campaign-config", "Frozen campaign configuration", `<p class="intro-copy">Eligibility-critical configuration below is read directly from the live Devnet Campaign account.</p>${detail}<p class="trust-note">${DEMO.label}; the short timing is demo-only.</p>`)}`;
  }
  return `${panel("campaign-config", "Frozen campaign configuration", `<p class="intro-copy">Eligibility-critical configuration is immutable after freeze. These values come from the deterministic campaign evidence fixture and are labeled accordingly.</p>`)}`;
}

function renderLivePanel(kind) {
  const actionLabel = kind === "reward" ? "VERIFY DEVNET CLAIM" : "LOAD DEVNET ACCOUNTS";
  const devnet = LIVE_DEVNET;
  return `<section class="technical-panel live-panel" aria-labelledby="live-panel-title"><p class="panel-kicker">BL_09 / OPTIONAL WALLET PATH</p><h2 id="live-panel-title">${devnet ? "LIVE DEVNET" : "LIVE LOCAL VALIDATOR"}</h2><p>${devnet ? "This account reader is pinned to Devnet. It checks the RPC genesis before reading state or offering a wallet transaction." : "Use only with the repository's local validator."}</p><div class="field-grid"><label>RPC URL<input id="rpc-url" type="url" inputmode="url" autocomplete="url" value="${devnet ? PUBLIC_CONFIG.rpcUrl : "http://127.0.0.1:8899"}"></label><label>Campaign PDA<input id="campaign-address" type="text" autocomplete="off" value="${devnet ? DEMO.campaign : ""}" placeholder="Campaign PDA"></label><label>Reward PDA<input id="reward-address" type="text" autocomplete="off" value="${devnet ? DEMO.reward : ""}" placeholder="Reward PDA (optional for read)"></label><label>Recipient token account<input id="recipient-address" type="text" autocomplete="off" value="${devnet ? DEMO.recipient : ""}" placeholder="Signer-owned token account"></label></div><div class="key-row"><button id="connect-wallet" class="key-button primary" type="button">CONNECT ${devnet ? "DEVNET" : "LOCAL"} WALLET</button><button id="load-live" class="key-button secondary" type="button">${actionLabel}</button><button id="claim-live" class="key-button success" type="button" disabled>CLAIM FIXED PAYOUT</button></div><output id="live-output" class="transaction-state" aria-live="polite">${devnet ? "Public Devnet state loads automatically. Connect a Devnet wallet to read its UserProgress and verify a supported Claim." : "No local wallet or accounts loaded."}</output></section>`;
}

function renderProgress(scenario) {
  const content = LIVE_DEVNET ? `<p class="intro-copy">The public Devnet user state is refetched from the configured UserProgress PDA. A connected wallet is additionally checked against its own PDA.</p><div class="detail-grid"><div><span class="metric-label">Configured DEMO progress</span><strong>${stageName()}</strong><p>Native CohortBuild CPI is recorded as Shipped before reward settlement.</p></div><div><span class="metric-label">Completion / Ship</span><strong>${link(DEMO.transactions.nativeCpiShip.explorerUrl, "VIEW CPI TX")}</strong><p>Explorer shows the real Devnet transaction.</p></div></div><dl class="proof-list"><dt>UserProgress</dt><dd>${code(DEMO.userProgress)} ${link(explorerAddress(DEMO.userProgress), "EXPLORER")}</dd><dt>Module finalization</dt><dd>${link(DEMO.transactions.moduleFinalization.explorerUrl, "VIEW TX")}</dd><dt>Completion</dt><dd>Owner, discriminator, PDA, challenge, wallet, and project are enforced by BuilderLoop.</dd><dt>Clock gate</dt><dd>${DEMO.timing.minimumElapsedSeconds} seconds plus ${DEMO.timing.minimumPeriodGap} period.</dd></dl>` : `<p class="intro-copy">The public view stays read-only. The optional local path only marks a success after the program account is refetched and verified.</p>`;
  return `${panel("progress", "Wallet-bound progress", content) }${renderReturnRail(scenario)}${renderLivePanel("progress")}`;
}

function renderReward(scenario) {
  const content = LIVE_DEVNET ? `<p class="intro-copy">Reward amount is stored in the Devnet Reward account; the claimant does not supply it. The verified demo Claim used a signer-owned same-mint recipient account.</p><div class="detail-grid"><div><span class="metric-label">Fixed amount</span><strong>${live.reward ? live.reward.amount.toString() : DEMO.label}</strong><p>Classic SPL test mint only. No token valuation is implied.</p></div><div><span class="metric-label">Claim status</span><strong>${rewardStateName()}</strong><p>${live.reward ? `${live.reward.claimed}/${live.reward.maxClaims} claims` : "Loading Devnet Reward"}</p></div></div><dl class="proof-list"><dt>Reward</dt><dd>${code(DEMO.reward)} ${link(explorerAddress(DEMO.reward), "EXPLORER")}</dd><dt>Mint</dt><dd>${code(DEMO.mint)} ${link(explorerAddress(DEMO.mint), "EXPLORER")}</dd><dt>Claim</dt><dd>${code(DEMO.claim)} ${link(explorerAddress(DEMO.claim), "EXPLORER")}</dd><dt>Settlement transaction</dt><dd>${link(DEMO.transactions.rewardClaimed.explorerUrl, "VIEW CLAIM TX")}</dd><dt>Duplicate protection</dt><dd>One Claim PDA exists per reward and wallet.</dd></dl><p class="trust-note">This completed DEMO CONFIGURATION has one claimed fixed payout. A connected wallet can load and verify its own supported Claim path; it cannot receive a payout without a Shipped UserProgress.</p>` : `<p class="intro-copy">Reward amount is stored in the Reward account; the claimant does not supply it.</p>`;
  return `${panel("reward", "Fixed reward settlement", content) }${renderReturnRail(scenario)}${renderLivePanel("reward")}`;
}

function renderArchitecture() {
  const nodes = ["CampaignConfig", "UserProgress", "ModuleReceipt", "Challenge", "BuildSubmission", "Completion", "Reward", "Claim", "SPL Token vault"];
  return `${panel("architecture", "Native CPI and settlement blueprint", `<p class="intro-copy">These are technical panels, not controls. BuilderLoop validates frozen state, then CohortBuild invokes the native Ship instruction through its source-authority PDA.</p><div class="architecture-grid">${nodes.map((node, index) => `<article class="architecture-node"><p>BL_${String(index + 1).padStart(2, "0")}</p><h3>${node}</h3><span>${architectureDescription(node)}</span></article>`).join("")}</div><div class="cpi-lane"><span>${code(EVIDENCE.cohortBuild)}</span><b>native CPI →</b><span>${code(EVIDENCE.program)}</span><b>→</b><span>classic SPL Token vault</span></div><p class="trust-note">Completion account bytes are serialized before the atomic CPI; static diagram nodes never initiate a transaction.</p>`)}`;
}

function architectureDescription(node) {
  return {
    CampaignConfig: "Frozen identities, schedule, gaps, and config hash.",
    UserProgress: "Signer-bound ordered stage and project commitment.",
    ModuleReceipt: "One canonical event, pending then finalized.",
    Challenge: "Configured source-side challenge identity.",
    BuildSubmission: "Source program's submitted project state.",
    Completion: "Wallet/project/challenge-bound native source output.",
    Reward: "Fixed amount, mint, config snapshot, window, authority.",
    Claim: "One PDA per reward and claimant wallet.",
    "SPL Token vault": "Reward-controlled classic token inventory.",
  }[node];
}

function renderEvidence() {
  const content = LIVE_DEVNET ? `<div class="detail-grid"><div><span class="metric-label">Repository</span><strong>Public GitHub</strong><p>${link("https://github.com/renkuror/builderloop", "renkuror/builderloop")}</p></div><div><span class="metric-label">Network evidence</span><strong>LIVE DEVNET</strong><p>Program, account, and finalized transaction links are public.</p></div></div><dl class="proof-list"><dt>BuilderLoop program</dt><dd>${code(PROGRAM_ID.toBase58())} ${link(explorerAddress(PROGRAM_ID.toBase58()), "EXPLORER")}</dd><dt>CohortBuild program</dt><dd>${code(COHORT_BUILD_ID.toBase58())} ${link(explorerAddress(COHORT_BUILD_ID.toBase58()), "EXPLORER")}</dd><dt>Module finalization</dt><dd>${link(DEMO.transactions.moduleFinalization.explorerUrl, "EXPLORER")}</dd><dt>Native CPI Ship</dt><dd>${link(DEMO.transactions.nativeCpiShip.explorerUrl, "EXPLORER")}</dd><dt>Fixed SPL Reward Claim</dt><dd>${link(DEMO.transactions.rewardClaimed.explorerUrl, "EXPLORER")}</dd></dl><p class="trust-note">The test mint and DEMO CONFIGURATION are public Devnet evidence, not sponsor, adoption, or Sybil-resistance claims.</p>` : `<p>Devnet evidence has not been configured.</p>`;
  return `${panel("evidence", "Reproducible evidence", content)}`;
}

function renderRoute(route, scenario) {
  const views = {
    overview: () => renderOverview(scenario),
    demo: () => renderDemo(scenario),
    campaign: renderCampaign,
    progress: () => renderProgress(scenario),
    reward: () => renderReward(scenario),
    architecture: renderArchitecture,
    evidence: renderEvidence,
  };
  return views[route.id]();
}

function renderFooter() {
  return `<footer class="page-footer"><p>BUILDERLOOP / ${LIVE_DEVNET ? "LIVE DEVNET DEMO CONFIGURATION" : "LOCALNET REFERENCE IMPLEMENTATION"}</p><p>${LIVE_DEVNET ? "Public accounts and Explorer links are verified on Devnet. No Mainnet operation is supported." : "Read-only fixture path first. Wallet controls remain optional and explicitly local."}</p></footer>`;
}

function writeToast(message) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function wireKeySounds(root) {
  for (const element of root.querySelectorAll(".key-button:not(#sound-button)")) {
    if (element.dataset.soundWired) continue;
    element.dataset.soundWired = "true";
    element.addEventListener("pointerdown", () => sound.handleActivation({ type: "pointerdown", disabled: element.disabled }));
    element.addEventListener("keydown", (event) => sound.handleActivation({ type: "keydown", key: event.key, disabled: element.disabled }));
    element.addEventListener("click", () => sound.handleActivation({ type: "click", disabled: element.disabled }));
  }
}

function bindInteractions() {
  for (const button of document.querySelectorAll("[data-action='set-scenario']")) {
    button.addEventListener("click", () => {
      state.scenario = button.dataset.scenario;
      const url = new URL(window.location.href);
      url.searchParams.set("scenario", state.scenario);
      window.history.replaceState({}, "", url);
      mount();
    });
  }
  for (const button of document.querySelectorAll("[data-action='select-stage']")) {
    button.addEventListener("click", () => {
      state.selectedStage = button.dataset.stage;
      mount();
      $("#proof-drawer")?.focus();
    });
  }
  for (const button of document.querySelectorAll("[data-action='copy']")) {
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        writeToast("Copied to clipboard.");
      } catch {
        writeToast("Clipboard access is unavailable; select the visible value to copy.");
      }
    });
  }
  $("[data-action='fixture-claim']")?.addEventListener("click", () => {
    state.scenario = state.scenario === "claimed" ? "early-ship" : "claimed";
    const url = new URL(window.location.href);
    url.searchParams.set("scenario", state.scenario);
    window.history.replaceState({}, "", url);
    mount();
  });
  $("#connect-wallet")?.addEventListener("click", connectWallet);
  $("#load-live")?.addEventListener("click", loadLiveState);
  $("#claim-live")?.addEventListener("click", claimReward);
}

function mount() {
  const route = currentRoute();
  const scenario = getScenario(state.scenario);
  app.innerHTML = `${renderHeader(route, scenario)}<main id="main-content" class="route-content">${renderRoute(route, scenario)}</main>${renderFooter()}<div id="toast" class="toast" role="status" aria-live="polite"></div>`;
  const soundHost = $("#sound-toggle");
  const soundButton = createKeyButton(document, {
    label: `SOUND: ${sound.enabled ? "ON" : "OFF"}`,
    className: "compact icon",
    ariaLabel: `Sound is ${sound.enabled ? "on" : "off"}. Toggle sound.`,
    testId: "sound-toggle",
    sound,
    onClick() {
      sound.toggle();
      mount();
    },
  });
  soundButton.id = "sound-button";
  soundHost.append(soundButton);
  wireKeySounds(app);
  bindInteractions();
  void refreshConfiguredDevnetState();
}

function hex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function keyAt(data, offset) {
  return new PublicKey(data.subarray(offset, offset + 32));
}

function i64(view, offset) {
  return Number(view.getBigInt64(offset, true));
}

function u64(view, offset) {
  return view.getBigUint64(offset, true);
}

function decodeClassicSplTokenAccount(data) {
  if (data.length < 165) throw new Error("Recipient token account has an invalid SPL Token layout.");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    mint: keyAt(data, 0),
    owner: keyAt(data, 32),
    amount: u64(view, 64),
  };
}

function decodeCampaign(data, address) {
  if (data.length !== 270 || !discriminators.campaign.every((byte, index) => data[index] === byte)) throw new Error("Campaign account has an invalid discriminator or layout");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    address,
    authority: keyAt(data, 8),
    campaignId: u64(view, 40),
    status: data[48],
    verifier: keyAt(data, 49),
    verifierEpoch: view.getUint32(81, true),
    verifierActive: Boolean(data[85]),
    rewardAuthority: keyAt(data, 86),
    startTs: i64(view, 118),
    endTs: i64(view, 126),
    periodSeconds: i64(view, 134),
    totalPeriods: data[142],
    minPeriodGap: data[143],
    minElapsedSeconds: i64(view, 144),
    sourceProgram: keyAt(data, 164),
    sourceAuthority: keyAt(data, 196),
    challengeId: u64(view, 228),
    paused: Boolean(data[236]),
    configHash: data.subarray(237, 269),
  };
}

function decodeProgress(data, address) {
  if (data.length !== 220 || !discriminators.progress.every((byte, index) => data[index] === byte)) throw new Error("UserProgress has the wrong owner, discriminator, or layout");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return { address, stage: data[72], projectId: data.subarray(73, 105), moduleFinalizedAt: i64(view, 169), modulePeriod: data[177], artifactHash: data.subarray(178, 210) };
}

function decodeReward(data, address) {
  if (data.length !== 211 || !discriminators.reward.every((byte, index) => data[index] === byte)) throw new Error("Reward account is missing or has an invalid discriminator or layout");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    address,
    campaign: keyAt(data, 8),
    authority: keyAt(data, 40),
    rewardId: u64(view, 72),
    configHash: data.subarray(80, 112),
    mint: keyAt(data, 112),
    vault: keyAt(data, 144),
    amount: u64(view, 176),
    maxClaims: view.getUint32(184, true),
    claimed: view.getUint32(188, true),
    startsAt: i64(view, 192),
    endsAt: i64(view, 200),
    status: data[208],
  };
}

function writeLive(message) {
  const output = $("#live-output");
  if (output) output.textContent = message;
}

async function connectWallet() {
  try {
    if (!window.solana?.connect) throw new Error(`Install or unlock a Solana wallet that exposes window.solana before using the ${LIVE_DEVNET ? "Devnet" : "local"} path.`);
    const response = await window.solana.connect();
    live.wallet = response.publicKey;
    writeLive(`Connected wallet ${live.wallet.toBase58()}. ${LIVE_DEVNET ? "Use a Devnet wallet; the configured RPC genesis is verified before reads or a claim." : "Load genuine local accounts to continue."}`);
  } catch (error) {
    writeLive(friendlyProgramError(error));
  }
}

async function assertDevnetConnection(connection) {
  if (!LIVE_DEVNET) return;
  const genesis = await connection.getGenesisHash();
  if (genesis !== DEVNET_GENESIS_HASH) throw new Error("Wallet/network mismatch: the selected RPC is not Solana Devnet.");
}

async function refreshConfiguredDevnetState() {
  if (!LIVE_DEVNET || live.configuredState !== "idle") return;
  live.configuredState = "loading";
  try {
    live.connection = new Connection(PUBLIC_CONFIG.rpcUrl, "finalized");
    await assertDevnetConnection(live.connection);
    const campaignKey = new PublicKey(DEMO.campaign);
    const rewardKey = new PublicKey(DEMO.reward);
    const progressKey = new PublicKey(DEMO.userProgress);
    const [campaignAccount, rewardAccount, progressAccount] = await Promise.all([
      live.connection.getAccountInfo(campaignKey, "finalized"),
      live.connection.getAccountInfo(rewardKey, "finalized"),
      live.connection.getAccountInfo(progressKey, "finalized"),
    ]);
    if (!campaignAccount || !campaignAccount.owner.equals(PROGRAM_ID)) throw new Error("Configured Devnet Campaign is missing or has the wrong owner.");
    if (!rewardAccount || !rewardAccount.owner.equals(PROGRAM_ID)) throw new Error("Configured Devnet Reward is missing or has the wrong owner.");
    if (!progressAccount || !progressAccount.owner.equals(PROGRAM_ID)) throw new Error("Configured Devnet UserProgress is missing or has the wrong owner.");
    live.campaign = decodeCampaign(campaignAccount.data, campaignKey);
    live.reward = decodeReward(rewardAccount.data, rewardKey);
    live.demoProgress = decodeProgress(progressAccount.data, progressKey);
    live.configuredState = "loaded";
  } catch (error) {
    live.configuredState = "failed";
    live.configuredError = friendlyProgramError(error);
  }
  mount();
}

async function loadLiveState() {
  try {
    const rpc = $("#rpc-url")?.value.trim();
    const campaignText = $("#campaign-address")?.value.trim();
    if (!rpc || !campaignText) throw new Error(`Enter a ${LIVE_DEVNET ? "Devnet" : "local"} RPC URL and Campaign PDA before loading.`);
    live.connection = new Connection(rpc, "finalized");
    await assertDevnetConnection(live.connection);
    const campaignKey = new PublicKey(campaignText);
    const account = await live.connection.getAccountInfo(campaignKey, "finalized");
    if (!account || !account.owner.equals(PROGRAM_ID)) throw new Error("Campaign account is missing or belongs to a different program.");
    live.campaign = decodeCampaign(account.data, campaignKey);
    if (live.wallet) await loadLiveProgress(campaignKey);
    const rewardText = $("#reward-address")?.value.trim();
    if (rewardText) await loadLiveReward(new PublicKey(rewardText));
    const progressSummary = live.progress ? ` UserProgress: ${stages[live.progress.stage] ?? "Unknown"}.` : " No UserProgress loaded for the connected wallet.";
    writeLive(`Verified Campaign ${live.campaign.campaignId.toString()} on ${LIVE_DEVNET ? "Devnet" : "the local validator"}. ${progressSummary}`);
    updateClaimButton();
  } catch (error) {
    writeLive(`${friendlyProgramError(error)} Raw: ${String(error?.message ?? error)}`);
    const claimButton = $("#claim-live");
    if (claimButton) claimButton.disabled = true;
  }
}

async function loadLiveProgress(campaignKey) {
  const [progressKey] = PublicKey.findProgramAddressSync([Buffer.from("user"), campaignKey.toBuffer(), live.wallet.toBuffer()], PROGRAM_ID);
  const account = await live.connection.getAccountInfo(progressKey, "finalized");
  live.progress = account ? decodeProgress(account.data, progressKey) : undefined;
}

async function loadLiveReward(address) {
  const account = await live.connection.getAccountInfo(address, "finalized");
  if (!account || !account.owner.equals(PROGRAM_ID)) throw new Error("Reward account is missing or belongs to a different program.");
  live.reward = decodeReward(account.data, address);
}

async function validateRecipientTokenAccount(recipient) {
  const account = await live.connection.getAccountInfo(recipient, "finalized");
  if (!account) throw new Error("Recipient token account is missing.");
  if (!account.owner.equals(TOKEN_PROGRAM_ID)) throw new Error("Recipient token account is not owned by the classic SPL Token program.");
  const token = decodeClassicSplTokenAccount(account.data);
  if (!token.mint.equals(live.reward.mint)) throw new Error("Recipient token account uses the wrong reward mint.");
  if (!token.owner.equals(live.wallet)) throw new Error("Recipient token account does not belong to the claiming signer.");
  return token;
}

function updateClaimButton() {
  const button = $("#claim-live");
  if (!button) return;
  button.disabled = !(live.wallet && live.campaign && live.progress?.stage === 3 && live.reward?.status === 2 && live.reward.campaign.equals(live.campaign.address));
}

async function claimReward() {
  try {
    if (!live.wallet || !live.connection || !live.campaign || !live.progress || !live.reward) throw new Error(`Connect a wallet and load an eligible ${LIVE_DEVNET ? "Devnet" : "local"} Campaign, UserProgress, and Reward first.`);
    await assertDevnetConnection(live.connection);
    const recipient = new PublicKey($("#recipient-address")?.value.trim());
    const recipientBefore = await validateRecipientTokenAccount(recipient);
    const [claim] = PublicKey.findProgramAddressSync([Buffer.from("claim"), live.reward.address.toBuffer(), live.wallet.toBuffer()], PROGRAM_ID);
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("global:claim_reward"));
    const instruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      data: Buffer.from(new Uint8Array(hash).subarray(0, 8)),
      keys: [
        { pubkey: live.wallet, isSigner: true, isWritable: true },
        { pubkey: live.campaign.address, isSigner: false, isWritable: false },
        { pubkey: live.progress.address, isSigner: false, isWritable: false },
        { pubkey: live.reward.address, isSigner: false, isWritable: true },
        { pubkey: live.reward.mint, isSigner: false, isWritable: false },
        { pubkey: live.reward.vault, isSigner: false, isWritable: true },
        { pubkey: recipient, isSigner: false, isWritable: true },
        { pubkey: claim, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
    });
    const latest = await live.connection.getLatestBlockhash("finalized");
    const transaction = new Transaction().add(instruction);
    transaction.feePayer = live.wallet;
    transaction.recentBlockhash = latest.blockhash;
    let signed;
    const flow = createTransactionFlow({
      onState(next, error) {
        writeLive(error ? `${friendlyProgramError(error)} Raw: ${String(error.message ?? error)}` : `Claim state: ${next}.`);
      },
      async requestSignature() {
        signed = await window.solana.signTransaction(transaction);
      },
      async submit() {
        return live.connection.sendRawTransaction(signed.serialize());
      },
      async confirm(signature) {
        await live.connection.confirmTransaction({ signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight }, "finalized");
      },
      async refetch() {
        const claimAccount = await live.connection.getAccountInfo(claim, "finalized");
        const recipientBalance = await live.connection.getTokenAccountBalance(recipient, "finalized");
        return { claimAccount, recipientBalance };
      },
      verify(result) {
        return Boolean(result.claimAccount) && BigInt(result.recipientBalance.value.amount) >= recipientBefore.amount + live.reward.amount;
      },
    });
    const result = await flow.run();
    writeLive(`Verified Claim PDA and recipient balance from ${LIVE_DEVNET ? "Devnet" : "local"} account state. Signature: ${result.signature}`);
    await loadLiveState();
  } catch (error) {
    writeLive(`${friendlyProgramError(error)} Raw: ${String(error?.message ?? error)} Retry after correcting the local account state.`);
  }
}

window.addEventListener("popstate", mount);
mount();

export { claimReward, decodeCampaign, decodeProgress, decodeReward, hex };
