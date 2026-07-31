import test from "node:test";
import assert from "node:assert/strict";
import { BeamReceiver, BeamSender } from "../src/lib/transport.mjs";

function payload(length) {
  return Uint8Array.from({ length }, (_, index) => (index * 17 + 11) & 0xff);
}

test("receiver accepts a valid session after unrelated or unsafe bytes", () => {
  const receiver = new BeamReceiver();
  assert.equal(receiver.add(new Uint8Array(100)).accepted, false);
  const sender = new BeamSender(payload(4096), { frameBytes: 512, sessionId: 42 });
  let result;
  for (let i = 0; i < sender.stats.blockCount * 4; i++) {
    result = receiver.add(sender.nextFrame());
    if (result.complete) break;
  }
  assert.equal(result.complete, true);
});

test("receiver expires a stalled session without retaining decoder state", () => {
  let now = 1_000;
  const receiver = new BeamReceiver({ sessionTimeoutMs: 100, now: () => now });
  const sender = new BeamSender(payload(2048), { frameBytes: 512, sessionId: 77 });
  assert.equal(receiver.add(sender.nextFrame()).accepted, true);
  now += 101;
  const expired = receiver.add(sender.nextFrame());
  assert.equal(expired.reason, "session-expired");
  assert.equal(receiver.decoder, null);
});
