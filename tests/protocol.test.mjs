import test from "node:test";
import assert from "node:assert/strict";
import { fnv1a, packFrame, parseFrame } from "../src/lib/protocol.mjs";

const block = Uint8Array.from({ length: 64 }, (_, i) => i);
const header = { sessionId: 123456, sequence: 17, blockCount: 9, blockLength: block.length, totalLength: 500, payloadFnv: fnv1a(block) };

test("frame protocol round-trips", () => {
  const parsed = parseFrame(packFrame(header, block));
  assert.deepEqual(parsed.header, header);
  assert.deepEqual(parsed.block, block);
});

test("parser rejects unrelated bytes", () => assert.equal(parseFrame(new Uint8Array(100)), null));
