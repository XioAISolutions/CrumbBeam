import test from "node:test";
import assert from "node:assert/strict";
import { inspectCrumb, parseCrumb } from "../src/lib/crumb.mjs";

const valid = `BEGIN CRUMB
v=1.4
kind=task
title=Optical handoff
source=tests
---
[goal]
Transfer this task.

[context]
No network path is available.

[constraints]
- preserve exact values
END CRUMB
`;

test("parses a valid CRUMB", () => {
  const parsed = parseCrumb(valid);
  assert.equal(parsed.headers.kind, "task");
  assert.deepEqual(Object.keys(parsed.sections), ["goal", "context", "constraints"]);
});

test("returns a useful error for malformed CRUMBs", () => {
  const result = inspectCrumb("hello");
  assert.equal(result.ok, false);
  assert.match(result.error, /BEGIN CRUMB/);
});
