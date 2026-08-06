import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  FLOW_SCENARIOS,
  ROUTES,
  createSoundController,
  createTransactionFlow,
  getScenario,
} from "../web/ui.js";

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

function createAudioFactory(counter) {
  return () => ({
    currentTime: 0,
    destination: {},
    createOscillator() {
      return {
        connect() {},
        start() {
          counter.starts += 1;
        },
        stop() {},
        frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        type: "square",
      };
    },
    createGain() {
      return { connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } };
    },
  });
}

test("mechanical frontend exposes all judge routes and a clearly labeled fixture path", () => {
  assert.deepEqual(ROUTES.map((route) => route.path), ["/", "/demo", "/campaign", "/progress", "/reward", "/architecture", "/evidence"]);
  assert.equal(FLOW_SCENARIOS[0].networkLabel, "DEMO FIXTURE — NOT LIVE");
  assert.equal(getScenario("early-ship").rail[1].state, "locked");
  assert.match(getScenario("early-ship").reason, /elapsed-time/i);
});

test("sound is opt-in, persists mute state, skips disabled controls, and never double-plays", () => {
  const storage = createStorage({ "builderloop.sound": "on" });
  const counter = { starts: 0 };
  const sound = createSoundController({ storage, audioContextFactory: createAudioFactory(counter), random: () => 0 });
  assert.equal(sound.enabled, true);
  assert.equal(counter.starts, 0, "must not autoplay");

  sound.handleActivation({ type: "pointerdown", disabled: false });
  sound.handleActivation({ type: "click", disabled: false });
  assert.equal(counter.starts, 1, "pointer and click are one physical activation");

  sound.handleActivation({ type: "keydown", key: "Enter", disabled: false });
  assert.equal(counter.starts, 2, "keyboard activation plays exactly once");
  sound.handleActivation({ type: "keydown", key: " ", disabled: true });
  assert.equal(counter.starts, 2, "disabled keycap remains silent");

  sound.setEnabled(false);
  assert.equal(storage.getItem("builderloop.sound"), "off");
  sound.handleActivation({ type: "click", disabled: false });
  assert.equal(counter.starts, 2, "muted controls remain silent");
});

test("transaction success is withheld until finalized account refetch verifies state", async () => {
  const seen = [];
  const flow = createTransactionFlow({
    onState(state) {
      seen.push(state);
    },
    async requestSignature() {},
    async submit() {
      return "local-signature";
    },
    async confirm() {},
    async refetch() {
      return { stage: "Shipped" };
    },
    verify(account) {
      return account.stage === "Shipped";
    },
  });
  const result = await flow.run();
  assert.equal(result.status, "verified from account state");
  assert.deepEqual(seen, ["awaiting wallet signature", "submitted", "confirming", "finalized", "refetching accounts", "verified from account state"]);
});

test("bundler treats the frontend entrypoint as a local path", () => {
  const buildScript = readFileSync("scripts/build-frontend.js", "utf8");
  assert.match(buildScript, /entryPoints:\s*\["\.\/web\/app\.js"\]/);
});
