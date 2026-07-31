import test from "node:test";
import assert from "node:assert/strict";
import { inspectEnvelope, packCrumbEnvelope, unpackCrumbEnvelope } from "../src/lib/envelope.mjs";

const crumb = `BEGIN CRUMB
v=1.4
kind=task
title=Encrypted test
source=node.test
---
[goal]
Verify the envelope.
[context]
The payload should survive packing.
[constraints]
- verify SHA-256
END CRUMB
`;

test("plain envelope round-trips", async () => {
  const packed = await packCrumbEnvelope(crumb, { filename: "test.crumb" });
  assert.equal(inspectEnvelope(packed).metadata.filename, "test.crumb");
  assert.equal((await unpackCrumbEnvelope(packed)).text, crumb);
});

test("encrypted envelope requires the correct passphrase", async () => {
  const packed = await packCrumbEnvelope(crumb, { passphrase: "correct horse battery staple" });
  assert.equal(inspectEnvelope(packed).encrypted, true);
  await assert.rejects(() => unpackCrumbEnvelope(packed, { passphrase: "wrong" }), /decrypt/);
  assert.equal((await unpackCrumbEnvelope(packed, { passphrase: "correct horse battery staple" })).text, crumb);
});
