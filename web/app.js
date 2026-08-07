import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Buffer } from "buffer";
import { deriveEffectiveLoyalty, formatCountdown, formatHeartbeat } from "./loyalty.js";
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
  heartbeatDemo: null,
};
const PROGRAM_ID = new PublicKey(PUBLIC_CONFIG.builderloopProgramId);
const COHORT_BUILD_ID = new PublicKey(PUBLIC_CONFIG.cohortBuildProgramId);
const DEVNET_GENESIS_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
const DEMO = PUBLIC_CONFIG.demo;
const HEARTBEAT_DEMO = PUBLIC_CONFIG.heartbeatDemo;
const LIVE_DEVNET = PUBLIC_CONFIG.cluster === "devnet" && PUBLIC_CONFIG.live === true && DEMO !== null;
const LIVE_HEARTBEAT = LIVE_DEVNET && HEARTBEAT_DEMO !== null;
const app = document.querySelector("#app");
const sound = createSoundController();
const live = {
  wallet: undefined,
  connection: undefined,
  campaign: undefined,
  progress: undefined,
  reward: undefined,
  demoProgress: undefined,
  loyaltyConfig: undefined,
  loyaltyState: undefined,
  loyaltyRewardGate: undefined,
  heartbeatReward: undefined,
  heartbeatConfiguredState: "idle",
  heartbeatConfiguredError: undefined,
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
    loyaltyConfig: [190, 240, 195, 182, 79, 177, 63, 71],
    loyaltyState: [149, 17, 163, 1, 74, 190, 103, 111],
    loyaltyRewardGate: [209, 109, 16, 173, 62, 140, 156, 105],
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
  return `<header class="site-header"><a class="wordmark" href="/" aria-label="BuilderLoop overview">BUILDER<span>LOOP</span><small>BL / HEARTBEAT INSTRUMENT</small></a><nav class="route-nav" aria-label="BuilderLoop pages">${nav}</nav><div class="header-tools"><span class="network-label" data-network="${LIVE_DEVNET ? "devnet" : "fixture"}">${devnetLabel(scenario)}</span><span id="sound-toggle"></span></div></header>`;
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
  return `<section class="return-rail technical-panel" aria-labelledby="return-rail-title"><div class="section-heading"><div><p class="panel-kicker">BL_04 / COHORTBUILD REFERENCE ADAPTER</p><h2 id="return-rail-title">Reference Activity Path</h2></div><span class="status-chip" data-state="${rail.at(-1).state}">${status}</span></div><p class="intro-copy">Module → Return → Ship is one verified meaningful-activity source. Heartbeat Loyalty is BuilderLoop’s reusable core.</p><div class="rail-stages" role="group" aria-label="Open proof detail for each return stage">${rail.map((stage) => `<button class="${keyClass(stage)} ${stage.id === selected.id ? "is-selected" : ""}" type="button" data-action="select-stage" data-stage="${stage.id}" data-state="${stage.state}" aria-pressed="${stage.id === selected.id}"><span>${stage.number}</span><strong>${stage.label}</strong><em>${stage.state}</em></button>`).join("")}</div><div id="proof-drawer" class="proof-drawer" tabindex="-1"><p class="panel-kicker">PROOF DRAWER / ${selected.number}</p><h3>${selected.label} <span class="state-line" data-state="${selected.state}">${selected.state}</span></h3><p>${selected.proof}</p><p><strong>${LIVE_DEVNET ? "Devnet account interpretation" : "Fixture interpretation"}:</strong> ${evidence}</p><details><summary>Raw evidence or error detail</summary>${code(LIVE_DEVNET ? `Campaign ${DEMO.campaign}; Program ${PROGRAM_ID.toBase58()}; RPC ${PUBLIC_CONFIG.rpcUrl}` : scenario.rawError)}</details></div></section>`;
}

function renderHero() {
  const note = LIVE_HEARTBEAT ? "The public demo uses a shortened Devnet heartbeat solely to make real Clock-based evidence practical. It does not represent a production cadence, Sybil resistance, or external adoption. This is not a claim of Sybil resistance." : "The implementation uses fixed project heartbeats. Automatic analytics-derived cadence and Sybil resistance are explicitly out of scope. This is not a claim of Sybil resistance.";
  return `<section class="hero"><div class="hero-copy"><p class="panel-kicker">BUILDERLOOP / HEARTBEAT-NORMALIZED ON-CHAIN LOYALTY</p><h1>Loyalty should move<br>at the speed of the product.</h1><p class="hero-lede">Different systems prove the activity. BuilderLoop measures whether a wallet keeps returning at that project’s own heartbeat, then exposes a persistent on-chain loyalty state that rewards can consume.</p><div class="key-row"><a class="key-button primary" href="/demo/">OPEN HEARTBEAT DEMO</a><a class="key-button secondary" href="/evidence/">VIEW EVIDENCE</a>${link("https://github.com/renkuror/builderloop", "GitHub")}</div><p class="trust-note">${note}</p></div>${keyboardArt()}</section>`;
}

function renderComparison() {
  return `<section class="comparison-grid" aria-label="Project cadence compared with BuilderLoop"><article class="technical-panel"><p class="panel-kicker">BL_05 / ONE GLOBAL CLOCK</p><h2>Tempo gets flattened</h2><ol class="manual-list"><li>Apply the same interval to every product.</li><li>Count repeated actions instead of return behavior.</li><li>Leave streaks in a private database.</li><li>Reconcile rewards off-chain.</li></ol></article><article class="technical-panel emphasis-panel"><p class="panel-kicker">BL_06 / BUILDERLOOP CORE</p><h2>Behavior is cadence-normalized</h2><ol class="manual-list"><li>A project freezes its own heartbeat.</li><li>A verifier or native program proves meaningful activity.</li><li>Solana Clock derives lazy decay and streaks.</li><li>A reward gate consumes the wallet’s effective loyalty.</li></ol></article></section>`;
}

function liveLoyaltyView() {
  return deriveEffectiveLoyalty(live.loyaltyConfig, live.loyaltyState);
}

function renderHeartbeatPanel() {
  if (!LIVE_HEARTBEAT) {
    return panel("heartbeat-loyalty", "Project Heartbeat", `<p class="intro-copy">The Heartbeat Loyalty protocol is implemented locally, but its public Devnet demo has not been configured in this build.</p><p class="trust-note">DEMO FIXTURE — NOT LIVE. No score, tier, streak, or reward eligibility is represented as live data.</p>`);
  }
  const view = liveLoyaltyView();
  if (!live.loyaltyConfig || !live.loyaltyState || !view) {
    const reason = live.heartbeatConfiguredState === "failed" ? live.heartbeatConfiguredError : "Reading LoyaltyConfig and LoyaltyState from Devnet…";
    return panel("heartbeat-loyalty", "Project Heartbeat", `<p class="intro-copy">LIVE DEVNET — ${reason}</p><p class="trust-note">The public demo uses a shortened heartbeat strictly for Devnet verification.</p>`);
  }
  const secondsToDecay = view.nextDecayAt - Math.floor(Date.now() / 1_000);
  return panel("heartbeat-loyalty", "Project Heartbeat", `<p class="intro-copy">LIVE DEVNET · DEMO CONFIGURATION — SHORTENED HEARTBEAT FOR VERIFICATION. The state below is decoded from public BuilderLoop accounts and recalculated client-side using the same fixed integer formula.</p><div class="loyalty-metric-grid"><div><span class="metric-label">Project heartbeat</span><strong>${formatHeartbeat(live.loyaltyConfig.heartbeatSeconds)}</strong><p>Fixed · policy epoch ${live.loyaltyConfig.policyEpoch}</p></div><div><span class="metric-label">Return streak</span><strong>${view.effectiveStreak} CYCLE${view.effectiveStreak === 1 ? "" : "S"}</strong><p>${view.missedPeriods > 0 ? `${view.missedPeriods} missed period(s) lazily applied.` : "Within the configured cadence window."}</p></div><div><span class="metric-label">Tier</span><strong>${view.tier}</strong><p>Thresholds are frozen in LoyaltyConfig.</p></div><div><span class="metric-label">Loyalty score</span><strong>${view.effectiveScore} / 1000</strong><p>Stored score: ${live.loyaltyState.scoreAtLastSettlement}.</p></div><div><span class="metric-label">Next decay</span><strong>${formatCountdown(secondsToDecay)}</strong><p>Derived from Solana Clock and last meaningful activity.</p></div><div><span class="metric-label">Last meaningful activity</span><strong>${new Date(live.loyaltyState.lastMeaningfulActivityAt * 1_000).toISOString()}</strong><p>${live.loyaltyState.totalCountedActivities} counted activity receipt(s).</p></div></div><dl class="proof-list"><dt>LoyaltyConfig</dt><dd>${code(HEARTBEAT_DEMO.loyaltyConfig)} ${link(explorerAddress(HEARTBEAT_DEMO.loyaltyConfig), "EXPLORER")}</dd><dt>LoyaltyState</dt><dd>${code(HEARTBEAT_DEMO.loyaltyState)} ${link(explorerAddress(HEARTBEAT_DEMO.loyaltyState), "EXPLORER")}</dd><dt>Policy hash</dt><dd>${code(hex(live.loyaltyConfig.configHash))}</dd><dt>Reward gate</dt><dd>${code(HEARTBEAT_DEMO.loyaltyRewardGate)} ${link(explorerAddress(HEARTBEAT_DEMO.loyaltyRewardGate), "EXPLORER")}</dd></dl>`);
}

function renderOverview(scenario) {
  const trust = LIVE_DEVNET
    ? `<div class="detail-grid"><div><h3>Enforced on Devnet</h3><p>Frozen heartbeat policy, verifier-bound activity, one-use receipts, one credit per cadence window, Clock-derived decay, wallet-bound LoyaltyState, and fixed SPL settlement are public account state.</p></div><div><h3>Disclosed trust boundary</h3><p>Meaningful activity semantics come from the configured verifier or source adapter. BuilderLoop does not prove unique humans, Sybil resistance, external adoption, or automatic heartbeat analytics.</p></div></div>`
    : `<div class="detail-grid"><div><h3>Enforced on localnet</h3><p>Frozen policy, verifier epoch, replay-resistant activity receipts, anti-burst timing, lazy decay, wallet binding, and a loyalty-gated fixed SPL claim.</p></div><div><h3>Disclosed trust boundary</h3><p>The campaign authority chooses the fixed heartbeat before policy creation. A verifier or source adapter defines what meaningful activity means.</p></div></div>`;
  return `${renderHero()}${renderHeartbeatPanel()}${renderComparison()}${panel("trust-disclosure", "What is enforced, and what is disclosed", trust)}${renderReturnRail(scenario)}`;
}

function scenarioControls(scenario) {
  return `<div class="scenario-controls" role="group" aria-label="Choose a prepared demo state">${FLOW_SCENARIOS.map((item) => `<button type="button" class="key-button compact ${item.id === scenario.id ? "success" : "secondary"}" data-action="set-scenario" data-scenario="${item.id}" aria-pressed="${item.id === scenario.id}">${item.label}</button>`).join("")}</div>`;
}

function renderDemo(scenario) {
  if (LIVE_HEARTBEAT) {
    return `${panel("judge-demo", "Live Heartbeat Loyalty proof", `<p class="intro-copy">${HEARTBEAT_DEMO.label}. These are public Devnet accounts, not a fixture. The ${HEARTBEAT_DEMO.timing.heartbeatSeconds}-second heartbeat is deliberately shortened only to make Clock-based verification practical.</p><div class="detail-grid"><div><span class="metric-label">Verified activity rule</span><strong>1 credit per ${HEARTBEAT_DEMO.timing.minimumReturnInterval}-second minimum return interval</strong><p>Repeated activity inside the window is rejected and cannot farm a streak.</p></div><div><span class="metric-label">On-chain consumer</span><strong>LOYALTY-GATED REWARD</strong><p>The fixed SPL claim checks effective score and tier before transfer.</p></div></div>`) }${renderHeartbeatPanel()}${panel("devnet-proof", "Public loyalty proof inventory", `<dl class="proof-list"><dt>Heartbeat campaign</dt><dd>${code(HEARTBEAT_DEMO.campaign)} ${link(explorerAddress(HEARTBEAT_DEMO.campaign), "EXPLORER")}</dd><dt>Policy creation</dt><dd>${link(HEARTBEAT_DEMO.transactions.policyCreated.explorerUrl, "VIEW TX")}</dd><dt>First verified activity</dt><dd>${link(HEARTBEAT_DEMO.transactions.firstActivity.explorerUrl, "VIEW TX")}</dd><dt>Second valid return</dt><dd>${link(HEARTBEAT_DEMO.transactions.secondActivity.explorerUrl, "VIEW TX")}</dd><dt>Loyalty-gated claim</dt><dd>${link(HEARTBEAT_DEMO.transactions.loyaltyRewardClaimed.explorerUrl, "VIEW TX")}</dd><dt>Programs</dt><dd>BuilderLoop ${code(PROGRAM_ID.toBase58())} ${link(explorerAddress(PROGRAM_ID.toBase58()), "EXPLORER")} · CohortBuild ${code(COHORT_BUILD_ID.toBase58())} ${link(explorerAddress(COHORT_BUILD_ID.toBase58()), "EXPLORER")}</dd></dl><p class="trust-note">Every link is a genuine Devnet account or successful transaction. The test mint has no implied value.</p>`) }${renderReturnRail(scenario)}`;
  }
  if (LIVE_DEVNET) {
    return `${panel("judge-demo", "Heartbeat Devnet evidence pending", `<p class="intro-copy">The currently configured public Devnet release proves the historical CohortBuild reference adapter. This build does not label any Heartbeat Loyalty fixture as live until a new policy, state, activity, and reward-gate evidence set is published.</p><p class="trust-note">DEMO FIXTURE — NOT LIVE for Heartbeat Loyalty.</p>`) }${renderReturnRail(scenario)}`;
  }
  return `${panel("judge-demo", "Heartbeat Loyalty fixture — not live", `<p class="intro-copy">The local test suite verifies fixed heartbeat policy, verifier-signed activity, anti-burst behavior, lazy decay, tiers, and a loyalty-gated SPL reward. This page does not fabricate a live score or transaction.</p>${scenarioControls(scenario)}`)}${renderReturnRail(scenario)}`;
}

function renderCampaign() {
  if (LIVE_HEARTBEAT) {
    const config = live.loyaltyConfig;
    const detail = config ? `<dl class="proof-list"><dt>Heartbeat campaign</dt><dd>${code(HEARTBEAT_DEMO.campaign)} ${link(explorerAddress(HEARTBEAT_DEMO.campaign), "EXPLORER")}</dd><dt>Policy</dt><dd>${code(HEARTBEAT_DEMO.loyaltyConfig)} ${link(explorerAddress(HEARTBEAT_DEMO.loyaltyConfig), "EXPLORER")}</dd><dt>Authority / verifier</dt><dd>${code(config.authority.toBase58())} / ${code(config.verifier.toBase58())} · verifier epoch ${config.verifierEpoch}</dd><dt>Heartbeat / minimum return</dt><dd>${formatHeartbeat(config.heartbeatSeconds)} / ${formatHeartbeat(config.minimumReturnInterval)}</dd><dt>Score policy</dt><dd>+${config.activeCredit} activity credit · +${config.streakBonus} streak bonus (cap ${config.streakBonusCap}) · −${config.decayPerMissedPeriod} per missed period</dd><dt>Tier thresholds</dt><dd>Bronze ${config.bronzeThreshold} · Silver ${config.silverThreshold} · Gold ${config.goldThreshold} · Platinum ${config.platinumThreshold}</dd><dt>Frozen policy hash</dt><dd>${code(hex(config.configHash))}</dd></dl>` : `<p class="transaction-state">${live.heartbeatConfiguredState === "failed" ? live.heartbeatConfiguredError : "Loading configured Devnet HeartbeatPolicy…"}</p>`;
    return `${panel("campaign-config", "Fixed project heartbeat policy", `<p class="intro-copy">The policy is a separate immutable PDA. It binds campaign identity, verifier epoch, cadence, score parameters, thresholds, and a deterministic hash without reinterpreting the legacy CampaignConfig account.</p>${detail}<p class="trust-note">This Devnet policy is intentionally shortened for evidence. Production projects choose their own real-world cadence.</p>`)}`;
  }
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
  if (LIVE_HEARTBEAT) return `${renderHeartbeatPanel()}${panel("progress", "Reusable wallet loyalty state", `<p class="intro-copy">LoyaltyState is wallet-bound and public. Its stored score is settled only when a verified activity occurs; its current effective score and tier are derived from Solana Clock without a scheduler.</p><p class="trust-note">The public account above belongs to the prepared Devnet demo wallet. A verifier or native source adapter—not the wallet—defines meaningful activity.</p>`)}${renderReturnRail(scenario)}`;
  const content = LIVE_DEVNET ? `<p class="intro-copy">The current deployed reference account remains a CohortBuild UserProgress. A new public LoyaltyState is not configured in this build.</p>` : `<p class="intro-copy">The public view stays read-only. The optional local path only marks a success after the program account is refetched and verified.</p>`;
  return `${panel("progress", "Wallet-bound loyalty state", content)}${renderLivePanel("progress")}${renderReturnRail(scenario)}`;
}

function renderReward(scenario) {
  if (LIVE_HEARTBEAT) {
    const gate = live.loyaltyRewardGate;
    const reward = live.heartbeatReward;
    const detail = gate && reward ? `<dl class="proof-list"><dt>Reward</dt><dd>${code(HEARTBEAT_DEMO.reward)} ${link(explorerAddress(HEARTBEAT_DEMO.reward), "EXPLORER")}</dd><dt>Reward gate</dt><dd>${code(HEARTBEAT_DEMO.loyaltyRewardGate)} ${link(explorerAddress(HEARTBEAT_DEMO.loyaltyRewardGate), "EXPLORER")}</dd><dt>Required loyalty</dt><dd>score ≥ ${gate.minimumScore} and tier ≥ ${["BRONZE", "SILVER", "GOLD", "PLATINUM"][gate.minimumTier] ?? "UNKNOWN"}</dd><dt>Fixed payout</dt><dd>${reward.amount.toString()} units from a classic SPL test mint</dd><dt>Claim</dt><dd>${code(HEARTBEAT_DEMO.claim)} ${link(explorerAddress(HEARTBEAT_DEMO.claim), "EXPLORER")}</dd><dt>Settlement</dt><dd>${link(HEARTBEAT_DEMO.transactions.loyaltyRewardClaimed.explorerUrl, "VIEW CLAIM TX")}</dd></dl>` : `<p class="transaction-state">${live.heartbeatConfiguredState === "failed" ? live.heartbeatConfiguredError : "Loading loyalty reward gate…"}</p>`;
    return `${panel("reward", "Loyalty-gated fixed SPL reward", `<p class="intro-copy">This separate claim instruction derives effective loyalty with Solana Clock, verifies the frozen policy hash and threshold, then transfers the fixed vault amount. The claimant never supplies the payout amount.</p>${detail}<p class="trust-note">Reward is one consumer of LoyaltyState. Access, discounts, and allowlists are future consumers, not implemented claims.</p>`)}`;
  }
  const content = LIVE_DEVNET ? `<p class="intro-copy">Reward amount is stored in the Devnet Reward account; the claimant does not supply it. The verified demo Claim used a signer-owned same-mint recipient account.</p><div class="detail-grid"><div><span class="metric-label">Fixed amount</span><strong>${live.reward ? live.reward.amount.toString() : DEMO.label}</strong><p>Classic SPL test mint only. No token valuation is implied.</p></div><div><span class="metric-label">Claim status</span><strong>${rewardStateName()}</strong><p>${live.reward ? `${live.reward.claimed}/${live.reward.maxClaims} claims` : "Loading Devnet Reward"}</p></div></div><dl class="proof-list"><dt>Reward</dt><dd>${code(DEMO.reward)} ${link(explorerAddress(DEMO.reward), "EXPLORER")}</dd><dt>Mint</dt><dd>${code(DEMO.mint)} ${link(explorerAddress(DEMO.mint), "EXPLORER")}</dd><dt>Claim</dt><dd>${code(DEMO.claim)} ${link(explorerAddress(DEMO.claim), "EXPLORER")}</dd><dt>Settlement transaction</dt><dd>${link(DEMO.transactions.rewardClaimed.explorerUrl, "VIEW CLAIM TX")}</dd><dt>Duplicate protection</dt><dd>One Claim PDA exists per reward and wallet.</dd></dl><p class="trust-note">This completed DEMO CONFIGURATION has one claimed fixed payout. A connected wallet can load and verify its own supported Claim path; it cannot receive a payout without a Shipped UserProgress.</p>` : `<p class="intro-copy">Reward amount is stored in the Reward account; the claimant does not supply it.</p>`;
  return `${panel("reward", "Fixed reward settlement", content) }${renderReturnRail(scenario)}${renderLivePanel("reward")}`;
}

function renderArchitecture() {
  const nodes = ["LoyaltyConfig", "ActivityReceipt", "LoyaltyState", "LoyaltyRewardGate", "Reward", "Claim", "SPL Token vault", "CohortBuild adapter", "UserProgress"];
  return `${panel("architecture", "Heartbeat loyalty architecture", `<p class="intro-copy">Different systems prove the facts. BuilderLoop applies one fixed project heartbeat, activity history, and Solana Clock to derive reusable wallet loyalty.</p><div class="architecture-grid">${nodes.map((node, index) => `<article class="architecture-node"><p>BL_${String(index + 1).padStart(2, "0")}</p><h3>${node}</h3><span>${architectureDescription(node)}</span></article>`).join("")}</div><div class="cpi-lane"><span>verifier Ed25519 or source program CPI</span><b>→</b><span>BuilderLoop LoyaltyState</span><b>→</b><span>reward gate / classic SPL vault</span></div><p class="trust-note">CohortBuild remains the reference native adapter. It proves one kind of source outcome; BuilderLoop decides whether verified activity represents consistent return behavior.</p>`)}`;
}

function architectureDescription(node) {
  return {
    LoyaltyConfig: "Immutable campaign-bound heartbeat, verifier epoch, score parameters, thresholds, and policy hash.",
    ActivityReceipt: "One verifier-attested activity ID per wallet and policy; replay protection lives in the PDA namespace.",
    LoyaltyState: "Wallet-bound stored score, last meaningful activity, streak, and counted-activity total.",
    LoyaltyRewardGate: "Frozen policy snapshot plus minimum effective score and tier for a Reward.",
    Reward: "Fixed amount, mint, campaign snapshot, window, and authority.",
    Claim: "One PDA per reward and claimant wallet, shared by legacy and loyalty claim paths.",
    "SPL Token vault": "Reward-controlled classic-token inventory with fixed transfer amounts.",
    "CohortBuild adapter": "Reference source program that proves a Completion through native CPI.",
    UserProgress: "Legacy/reference ordered Module → Return → Ship state, preserved unchanged.",
  }[node];
}

function renderEvidence() {
  const content = LIVE_HEARTBEAT ? `<div class="detail-grid"><div><span class="metric-label">Repository</span><strong>Public GitHub</strong><p>${link("https://github.com/renkuror/builderloop", "renkuror/builderloop")}</p></div><div><span class="metric-label">Network evidence</span><strong>LIVE DEVNET</strong><p>Policy, activity, state, gate, and finalized claim are public.</p></div></div><dl class="proof-list"><dt>BuilderLoop program</dt><dd>${code(PROGRAM_ID.toBase58())} ${link(explorerAddress(PROGRAM_ID.toBase58()), "EXPLORER")}</dd><dt>Heartbeat policy</dt><dd>${link(HEARTBEAT_DEMO.transactions.policyCreated.explorerUrl, "EXPLORER")}</dd><dt>First activity</dt><dd>${link(HEARTBEAT_DEMO.transactions.firstActivity.explorerUrl, "EXPLORER")}</dd><dt>Second return</dt><dd>${link(HEARTBEAT_DEMO.transactions.secondActivity.explorerUrl, "EXPLORER")}</dd><dt>Loyalty-gated SPL claim</dt><dd>${link(HEARTBEAT_DEMO.transactions.loyaltyRewardClaimed.explorerUrl, "EXPLORER")}</dd><dt>Historical CohortBuild CPI adapter</dt><dd>${link(DEMO.transactions.nativeCpiShip.explorerUrl, "EXPLORER")}</dd></dl><p class="trust-note">The short Devnet heartbeat and test mint are evidence only. They do not demonstrate organic retention, sponsor independence, or Sybil resistance.</p>` : LIVE_DEVNET ? `<p class="intro-copy">Historical CohortBuild Devnet evidence is configured, but a Heartbeat Loyalty evidence set is not yet published by this build.</p><p class="trust-note">DEMO FIXTURE — NOT LIVE for Heartbeat Loyalty.</p>` : `<p>Devnet evidence has not been configured.</p>`;
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
  return `<footer class="page-footer"><p>BUILDERLOOP / ${LIVE_HEARTBEAT ? "LIVE DEVNET HEARTBEAT LOYALTY" : LIVE_DEVNET ? "DEVNET REFERENCE ADAPTER" : "LOCALNET HEARTBEAT IMPLEMENTATION"}</p><p>${LIVE_DEVNET ? "Public accounts and Explorer links are verified on Devnet. Mainnet is not supported." : "Read-only fixture path first. No loyalty fixture is represented as live."}</p></footer>`;
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
  void refreshConfiguredHeartbeatState();
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

function decodeLoyaltyConfig(data, address) {
  if (data.length !== 217 || !discriminators.loyaltyConfig.every((byte, index) => data[index] === byte)) throw new Error("LoyaltyConfig has an invalid discriminator or layout");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    address,
    campaign: keyAt(data, 8),
    campaignConfigHash: data.subarray(40, 72),
    authority: keyAt(data, 72),
    verifier: keyAt(data, 104),
    verifierEpoch: view.getUint32(136, true),
    heartbeatSeconds: i64(view, 140),
    minimumReturnInterval: i64(view, 148),
    activeCredit: view.getUint16(156, true),
    streakBonus: view.getUint16(158, true),
    streakBonusCap: view.getUint16(160, true),
    decayPerMissedPeriod: view.getUint16(162, true),
    bronzeThreshold: view.getUint16(164, true),
    silverThreshold: view.getUint16(166, true),
    goldThreshold: view.getUint16(168, true),
    platinumThreshold: view.getUint16(170, true),
    policyEpoch: view.getUint32(172, true),
    activatedAt: i64(view, 176),
    configHash: data.subarray(184, 216),
  };
}

function decodeLoyaltyState(data, address) {
  if (data.length !== 125 || !discriminators.loyaltyState.every((byte, index) => data[index] === byte)) throw new Error("LoyaltyState has an invalid discriminator or layout");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    address,
    loyaltyConfig: keyAt(data, 8),
    campaign: keyAt(data, 40),
    wallet: keyAt(data, 72),
    scoreAtLastSettlement: view.getUint16(104, true),
    lastMeaningfulActivityAt: i64(view, 106),
    streak: view.getUint16(114, true),
    totalCountedActivities: view.getUint32(116, true),
    policyEpoch: view.getUint32(120, true),
  };
}

function decodeLoyaltyRewardGate(data, address) {
  if (data.length !== 144 || !discriminators.loyaltyRewardGate.every((byte, index) => data[index] === byte)) throw new Error("LoyaltyRewardGate has an invalid discriminator or layout");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    address,
    reward: keyAt(data, 8),
    loyaltyConfig: keyAt(data, 40),
    authority: keyAt(data, 72),
    policyHash: data.subarray(104, 136),
    policyEpoch: view.getUint32(136, true),
    minimumScore: view.getUint16(140, true),
    minimumTier: data[142],
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

async function refreshConfiguredHeartbeatState() {
  if (!LIVE_HEARTBEAT || live.heartbeatConfiguredState !== "idle") return;
  live.heartbeatConfiguredState = "loading";
  try {
    live.connection ??= new Connection(PUBLIC_CONFIG.rpcUrl, "finalized");
    await assertDevnetConnection(live.connection);
    const campaignKey = new PublicKey(HEARTBEAT_DEMO.campaign);
    const configKey = new PublicKey(HEARTBEAT_DEMO.loyaltyConfig);
    const stateKey = new PublicKey(HEARTBEAT_DEMO.loyaltyState);
    const gateKey = new PublicKey(HEARTBEAT_DEMO.loyaltyRewardGate);
    const rewardKey = new PublicKey(HEARTBEAT_DEMO.reward);
    const [campaignAccount, configAccount, stateAccount, gateAccount, rewardAccount] = await Promise.all([
      live.connection.getAccountInfo(campaignKey, "finalized"),
      live.connection.getAccountInfo(configKey, "finalized"),
      live.connection.getAccountInfo(stateKey, "finalized"),
      live.connection.getAccountInfo(gateKey, "finalized"),
      live.connection.getAccountInfo(rewardKey, "finalized"),
    ]);
    if (![campaignAccount, configAccount, stateAccount, gateAccount, rewardAccount].every(Boolean)) throw new Error("Configured Heartbeat Loyalty evidence account is missing on Devnet.");
    if (![campaignAccount, configAccount, stateAccount, gateAccount, rewardAccount].every((account) => account.owner.equals(PROGRAM_ID))) throw new Error("Configured Heartbeat Loyalty evidence account has the wrong owner.");
    const campaign = decodeCampaign(campaignAccount.data, campaignKey);
    const config = decodeLoyaltyConfig(configAccount.data, configKey);
    const loyaltyState = decodeLoyaltyState(stateAccount.data, stateKey);
    const gate = decodeLoyaltyRewardGate(gateAccount.data, gateKey);
    const reward = decodeReward(rewardAccount.data, rewardKey);
    const [expectedConfig] = PublicKey.findProgramAddressSync([Buffer.from("loyalty_config"), campaignKey.toBuffer()], PROGRAM_ID);
    const [expectedState] = PublicKey.findProgramAddressSync([Buffer.from("loyalty_state"), configKey.toBuffer(), new PublicKey(HEARTBEAT_DEMO.user).toBuffer()], PROGRAM_ID);
    const [expectedGate] = PublicKey.findProgramAddressSync([Buffer.from("loyalty_reward_gate"), rewardKey.toBuffer()], PROGRAM_ID);
    const [expectedVault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), rewardKey.toBuffer()], PROGRAM_ID);
    if (!configKey.equals(expectedConfig) || !stateKey.equals(expectedState) || !gateKey.equals(expectedGate) || !reward.vault.equals(expectedVault)) throw new Error("Heartbeat Loyalty evidence does not use canonical BuilderLoop PDAs.");
    if (!config.campaign.equals(campaignKey) || hex(config.campaignConfigHash) !== hex(campaign.configHash) || !loyaltyState.loyaltyConfig.equals(configKey) || !loyaltyState.campaign.equals(campaignKey) || !gate.loyaltyConfig.equals(configKey) || !gate.reward.equals(rewardKey) || !reward.campaign.equals(campaignKey)) throw new Error("Heartbeat Loyalty evidence accounts do not form the expected PDA graph.");
    if (gate.policyEpoch !== config.policyEpoch || hex(gate.policyHash) !== hex(config.configHash)) throw new Error("Loyalty reward gate does not snapshot the configured policy.");
    live.loyaltyConfig = config;
    live.loyaltyState = loyaltyState;
    live.loyaltyRewardGate = gate;
    live.heartbeatReward = reward;
    live.heartbeatConfiguredState = "loaded";
  } catch (error) {
    live.heartbeatConfiguredState = "failed";
    live.heartbeatConfiguredError = friendlyProgramError(error);
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

export { claimReward, decodeCampaign, decodeLoyaltyConfig, decodeLoyaltyRewardGate, decodeLoyaltyState, decodeProgress, decodeReward, hex };
