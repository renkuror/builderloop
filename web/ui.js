export const ROUTES = Object.freeze([
  { path: "/", label: "Overview", id: "overview" },
  { path: "/demo", label: "Heartbeat demo", id: "demo" },
  { path: "/campaign", label: "Campaign", id: "campaign" },
  { path: "/progress", label: "Progress", id: "progress" },
  { path: "/reward", label: "Reward", id: "reward" },
  { path: "/architecture", label: "Architecture", id: "architecture" },
  { path: "/evidence", label: "Evidence", id: "evidence" },
]);

const fixtureEvidence = Object.freeze({
  campaign: "4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi",
  user: "US517G5965aydkZ46HS38QLi7UQiSojurfbQfKCELFx",
  program: "3mK8tTZU3vFRxSobUaTAcft68w3AYUmULQnmzvfPL4Q2",
  cohortBuild: "BwT81huRfLF1QHVHXu9hiGS5iXjFjmdZixE7fEHckWAF",
  verifier: "8qbHbw2BbbTHBW1sbeqakYXVKRQM8Ne7pLK7m6CVfeR",
  rewardAuthority: "CktRuQ2mttgRGkXJtyksdKHjUdc2C4TgDzyB98oEzy8",
  sourceProgram: "GgBaCs3NCBuZN12kCJgAW63ydqohFkHEdfdEXBPzLHq",
  sourceAuthority: "LbUiWL3xVV8hTFYBVdbTNrpDo41NKS6o3LHHuDzjfcY",
  mint: "YMN9Qj5jPNp7j14VPcML1B6xGgcPWVZUGLFU3Mnyfaf",
  configHash: "c469e489a19df5cdaaa13f4f9e5c900ab2d529898713fa867ad92e7590aed0fd",
  projectId: "c9b9853b2917ba67a949077909db2683d398508beffc2d206b176e3f77280ed8",
  artifactHash: "20054e3f59e3c4ee095c967d2c66e21745a501c389a52242083e78e5294385bb",
  eventIdHash: "ca135fbd44c2d9bb5ee0c598276ccba5f463491580416f90a7578f54c6b0d41a",
  attestationHash: "06e845a2c911d99fd4a71f828faceb71b449295ae694e80ab6ceee148924e8a1",
});

export const EVIDENCE = fixtureEvidence;

const rail = (module, gate, ship, reward) => [
  { id: "module", number: "01", label: "MODULE", state: module, proof: "The verifier-signed Module receipt binds the campaign, wallet, event, and project commitment." },
  { id: "return", number: "02", label: "RETURN GATE", state: gate, proof: "Ship requires the configured elapsed-time and discrete-period gaps after a finalized Module." },
  { id: "ship", number: "03", label: "SHIP", state: ship, proof: "CohortBuild serializes Completion, then invokes BuilderLoop through its configured source-authority PDA." },
  { id: "reward", number: "04", label: "REWARD", state: reward, proof: "A funded Reward fixes the claim amount and allows one Claim PDA per reward and wallet." },
];

export const FLOW_SCENARIOS = Object.freeze([
  {
    id: "shipped",
    label: "Shipped / claimable",
    networkLabel: "DEMO FIXTURE — NOT LIVE",
    statusLabel: "SHIPPED",
    rail: rail("completed", "completed", "shipped", "claimable"),
    reason: "The prepared fixture has cleared the frozen return gate. A same-wallet, same-project native Ship was verified before reward eligibility.",
    rawError: "No program error. Fixture playback is not a submitted transaction.",
    stage: "Shipped",
    earliestShip: "T+120 seconds and period 3",
    claim: "Claimable once in the fixture; live Claim requires account and recipient-balance verification.",
  },
  {
    id: "pending-module",
    label: "Pending Module",
    networkLabel: "DEMO FIXTURE — NOT LIVE",
    statusLabel: "PENDING",
    rail: rail("pending", "locked", "locked", "locked"),
    reason: "Module receipt is still pending. The verifier challenge delay has not finalized, so Ship cannot begin.",
    rawError: "ModulePending: submit_module_attestation receipt has not reached finalized status.",
    stage: "ModulePending",
    earliestShip: "Unavailable until Module finalizes; then T+120 seconds and two periods.",
    claim: "Locked: a pending Module never unlocks Reward.",
  },
  {
    id: "early-ship",
    label: "Early Ship rejection",
    networkLabel: "DEMO FIXTURE — NOT LIVE",
    statusLabel: "LOCKED",
    rail: rail("completed", "locked", "rejected", "locked"),
    reason: "LOCKED — Ship rejected because the 120-second elapsed-time gate and required two-period return gap are not both satisfied.",
    rawError: "ElapsedTimeGate / PeriodGate: Clock-derived return criteria have not been met.",
    stage: "ModuleFinalized",
    earliestShip: "Earliest Ship: Module finalized at T0 + 120 seconds; current period must be at least module period + 2.",
    claim: "Locked: Ship must be confirmed from UserProgress before claim becomes available.",
  },
  {
    id: "claimed",
    label: "Reward claimed",
    networkLabel: "DEMO FIXTURE — NOT LIVE",
    statusLabel: "CLAIMED",
    rail: rail("completed", "completed", "shipped", "claimed"),
    reason: "The fixture represents a confirmed Claim PDA and recipient balance refetch. A second claim is rejected by the one-claim-per-reward-and-wallet rule.",
    rawError: "DuplicateClaim: a Claim PDA already exists for this reward and wallet.",
    stage: "Shipped",
    earliestShip: "Satisfied in this prepared fixture.",
    claim: "Claimed — duplicate protection remains active. Fixture playback is not a token transfer.",
  },
]);

export function getScenario(id) {
  return FLOW_SCENARIOS.find((scenario) => scenario.id === id) ?? FLOW_SCENARIOS[0];
}

export const TRANSACTION_STATES = Object.freeze([
  "idle",
  "awaiting wallet signature",
  "submitted",
  "confirming",
  "finalized",
  "refetching accounts",
  "verified from account state",
]);

export function createTransactionFlow({ onState = () => {}, requestSignature, submit, confirm, refetch, verify }) {
  let state = "idle";
  const update = (next) => {
    state = next;
    onState(next);
  };
  return {
    get state() {
      return state;
    },
    async run() {
      try {
        update("awaiting wallet signature");
        await requestSignature();
        update("submitted");
        const signature = await submit();
        update("confirming");
        await confirm(signature);
        update("finalized");
        update("refetching accounts");
        const account = await refetch(signature);
        if (!verify(account)) throw new Error("Finalized transaction did not produce the required account state");
        update("verified from account state");
        return { status: state, signature, account };
      } catch (error) {
        state = "failed";
        onState(state, error);
        throw error;
      }
    },
  };
}

export function createSoundController({ storage = globalThis.localStorage, audioContextFactory, random = Math.random } = {}) {
  const storageKey = "builderloop.sound";
  let enabled = storage?.getItem(storageKey) !== "off";
  let suppressNextClick = false;
  let context;

  const getContext = () => {
    if (context) return context;
    const Factory = audioContextFactory ?? globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Factory) return undefined;
    context = audioContextFactory ? Factory() : new Factory();
    return context;
  };

  const play = () => {
    if (!enabled) return false;
    const audio = getContext();
    if (!audio) return false;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const start = audio.currentTime;
    const pitch = 145 + Math.round(random() * 60);
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(pitch, start);
    oscillator.frequency.exponentialRampToValueAtTime(74, start + 0.04);
    gain.gain.setValueAtTime(0.026, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.052);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.055);
    return true;
  };

  return {
    get enabled() {
      return enabled;
    },
    setEnabled(next) {
      enabled = Boolean(next);
      storage?.setItem(storageKey, enabled ? "on" : "off");
      return enabled;
    },
    toggle() {
      return this.setEnabled(!enabled);
    },
    handleActivation(event = {}) {
      if (event.disabled) return false;
      const isKeyboard = event.type === "keydown" && (event.key === "Enter" || event.key === " ");
      if (event.type === "pointerdown" || isKeyboard) {
        suppressNextClick = true;
        return play();
      }
      if (event.type === "click" && suppressNextClick) {
        suppressNextClick = false;
        return false;
      }
      return event.type === "click" ? play() : false;
    },
  };
}

export function createKeyButton(documentRef, { label, className = "", disabled = false, onClick, sound, ariaLabel, type = "button", testId } = {}) {
  const button = documentRef.createElement("button");
  button.type = type;
  button.className = `key-button ${className}`.trim();
  button.textContent = label;
  button.disabled = disabled;
  if (ariaLabel) button.setAttribute("aria-label", ariaLabel);
  if (testId) button.dataset.testid = testId;
  button.addEventListener("pointerdown", () => sound?.handleActivation({ type: "pointerdown", disabled: button.disabled }));
  button.addEventListener("keydown", (event) => sound?.handleActivation({ type: "keydown", key: event.key, disabled: button.disabled }));
  button.addEventListener("click", (event) => {
    sound?.handleActivation({ type: "click", disabled: button.disabled });
    if (!button.disabled) onClick?.(event);
  });
  return button;
}

export function friendlyProgramError(error) {
  const raw = String(error?.message ?? error ?? "Unknown transaction error");
  const mappings = [
    [/ModulePending/i, "Module is pending; wait for the verifier challenge delay to finalize."],
    [/ElapsedTime|TimeGate/i, "The campaign-defined elapsed-time return gate is still locked."],
    [/PeriodGate/i, "The campaign-defined discrete-period return gate is still locked."],
    [/WrongWallet|Signer/i, "The connected wallet does not match UserProgress."],
    [/Project/i, "Completion does not match the Module project commitment."],
    [/Challenge/i, "Completion does not match the frozen challenge ID."],
    [/Source/i, "Completion does not match the configured source program or authority."],
    [/Completion/i, "Completion account validation failed."],
    [/DuplicateClaim/i, "This wallet has already claimed this reward."],
    [/Paused/i, "Reward actions are paused by the configured authority."],
    [/Closed|Ended/i, "The claim window is closed."],
  ];
  return mappings.find(([pattern]) => pattern.test(raw))?.[1] ?? raw;
}
