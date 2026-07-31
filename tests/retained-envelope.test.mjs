import test from "node:test";
import assert from "node:assert/strict";
import { VolatileEnvelope } from "../src/lib/retained-envelope.mjs";

function harness(ttlMs = 100) {
  let now = 1_000;
  let callback = null;
  const retained = new VolatileEnvelope({
    ttlMs,
    now: () => now,
    setTimer: (fn) => { callback = fn; return 1; },
    clearTimer: () => { callback = null; },
  });
  return {
    retained,
    advance: (ms) => { now += ms; },
    fireTimer: () => callback?.(),
  };
}

test("retains a private copy rather than the caller's buffer", () => {
  const { retained } = harness();
  const source = Uint8Array.from([1, 2, 3]);
  retained.retain(source);
  source.fill(9);
  assert.deepEqual(retained.peek(), Uint8Array.from([1, 2, 3]));
});

test("discard zeroes and releases retained bytes", () => {
  const { retained } = harness();
  retained.retain(Uint8Array.from([4, 5, 6]));
  const view = retained.peek();
  retained.discard();
  assert.deepEqual(view, Uint8Array.from([0, 0, 0]));
  assert.equal(retained.peek(), null);
});

test("retained envelopes expire without persistence", () => {
  const { retained, advance } = harness();
  retained.retain(Uint8Array.from([7, 8]));
  advance(101);
  assert.equal(retained.hasValue, false);
  assert.equal(retained.peek(), null);
});
