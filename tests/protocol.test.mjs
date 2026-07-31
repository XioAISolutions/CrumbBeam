import test from "node:test";
import assert from "node:assert/strict";
import {
  FRAME_HEADER_LENGTH,
  MAX_BLOCK_LENGTH,
  MAX_ENVELOPE_BYTES,
  fnv1a,
  packFrame,
  parseFrame,
  validateFrameHeader,
} from "../src/lib/protocol.mjs";

const block = Uint8Array.from({ length: 64 }, (_, i) => i);
const header = {
  sessionId: 123456,
  sequence: 17,
  blockCount: 8,
  blockLength: block.length,
  totalLength: 500,
  payloadFnv: fnv1a(block),
};

test("frame protocol round-trips", () => {
  const parsed = parseFrame(packFrame(header, block));
  assert.deepEqual(parsed.header, header);
  assert.deepEqual(parsed.block, block);
});

test("parser rejects unrelated bytes", () => assert.equal(parseFrame(new Uint8Array(100)), null));

test("maximum documented envelope geometry is accepted", () => {
  const blockCount = Math.ceil(MAX_ENVELOPE_BYTES / MAX_BLOCK_LENGTH);
  assert.equal(validateFrameHeader({
    ...header,
    blockCount,
    blockLength: MAX_BLOCK_LENGTH,
    totalLength: MAX_ENVELOPE_BYTES,
  }), null);
});

test("header validation rejects unsafe allocation geometry", () => {
  assert.equal(validateFrameHeader({ ...header, blockLength: MAX_BLOCK_LENGTH + 1 }), "invalid-block-length");
  assert.equal(validateFrameHeader({ ...header, totalLength: MAX_ENVELOPE_BYTES + 1 }), "invalid-total-length");
  assert.equal(validateFrameHeader({ ...header, blockCount: 65_535, blockLength: 4096, totalLength: MAX_ENVELOPE_BYTES }), "padded-payload-too-large");
  assert.equal(validateFrameHeader({ ...header, blockCount: 2, blockLength: 64, totalLength: 64 }), "inconsistent-block-geometry");
});

test("parser rejects oversized QR frame bytes before reading a session", () => {
  const oversized = new Uint8Array(FRAME_HEADER_LENGTH + MAX_BLOCK_LENGTH + 1);
  oversized[0] = 0x43;
  oversized[1] = 0x42;
  oversized[2] = 1;
  assert.equal(parseFrame(oversized), null);
});
