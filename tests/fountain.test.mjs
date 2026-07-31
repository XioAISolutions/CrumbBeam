import test from "node:test";
import assert from "node:assert/strict";
import { LTDecoder, LTEncoder } from "../src/lib/fountain.mjs";

function deterministicPayload(length) { return Uint8Array.from({ length }, (_, i) => (i * 31 + 7) & 0xff); }

test("fountain decoder reconstructs out-of-order frames with losses", () => {
  const payload = deterministicPayload(48_321);
  const blockLength = 512;
  const sessionId = 0x1234abcd;
  const encoder = new LTEncoder(payload, blockLength, sessionId);
  const decoder = new LTDecoder(encoder.blockCount, blockLength, sessionId, payload.length);
  const sequences = [];
  for (let seq = 0; seq < encoder.blockCount * 3; seq++) if (seq % 5 !== 0) sequences.push(seq);
  sequences.reverse();
  for (const seq of sequences) {
    decoder.addFrame(seq, encoder.encode(seq));
    if (decoder.isComplete) break;
  }
  assert.equal(decoder.isComplete, true);
  assert.deepEqual(decoder.assemble(), payload);
});

test("duplicate frames are ignored", () => {
  const payload = deterministicPayload(2048);
  const encoder = new LTEncoder(payload, 256, 99);
  const decoder = new LTDecoder(encoder.blockCount, 256, 99, payload.length);
  decoder.addFrame(1, encoder.encode(1));
  decoder.addFrame(1, encoder.encode(1));
  assert.equal(decoder.framesNew, 1);
  assert.equal(decoder.framesDuplicate, 1);
});

test("distinct-frame budget prevents unbounded seen-set growth", () => {
  const payload = deterministicPayload(4096);
  const encoder = new LTEncoder(payload, 256, 101);
  const decoder = new LTDecoder(encoder.blockCount, 256, 101, payload.length);
  decoder.maxFrames = 1;
  assert.equal(decoder.addFrame(0, encoder.encode(0)), true);
  assert.equal(decoder.addFrame(1, encoder.encode(1)), false);
  assert.equal(decoder.seen.size, 1);
  assert.equal(decoder.framesRejected, 1);
});
