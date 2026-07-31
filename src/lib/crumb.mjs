const REQUIRED_HEADERS = ["v", "kind", "source"];
const REQUIRED_SECTIONS = {
  task: ["goal", "context", "constraints"],
  mem: ["consolidated"],
  map: ["project", "modules"],
  log: ["entries"],
  todo: ["tasks"],
  wake: ["identity"],
  delta: ["changes"],
  agent: ["identity"],
  passport: ["identity", "permissions"],
  audit: ["goal", "actions", "verdict"],
};

export function parseCrumb(text) {
  if (typeof text !== "string") throw new TypeError("CRUMB payload must be text");
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines.at(-1).trim()) lines.pop();

  if (lines[0] !== "BEGIN CRUMB") throw new Error("missing BEGIN CRUMB marker");
  if (lines.at(-1) !== "END CRUMB") throw new Error("missing END CRUMB marker");

  const sep = lines.indexOf("---");
  if (sep < 0) throw new Error("missing header separator ---");

  const headers = {};
  for (const line of lines.slice(1, sep)) {
    if (!line.trim()) continue;
    const idx = line.indexOf("=");
    if (idx < 1) throw new Error(`invalid header line: ${line}`);
    headers[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }

  for (const key of REQUIRED_HEADERS) {
    if (!headers[key]) throw new Error(`missing required header: ${key}`);
  }

  const sections = {};
  let current = null;
  for (const line of lines.slice(sep + 1, -1)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      current = trimmed.slice(1, -1).trim().toLowerCase();
      sections[current] ??= [];
      continue;
    }
    if (!current) {
      if (trimmed) throw new Error("body content found before first section");
      continue;
    }
    sections[current].push(line);
  }

  const required = REQUIRED_SECTIONS[headers.kind];
  if (!required) throw new Error(`unknown CRUMB kind: ${headers.kind}`);
  for (const section of required) {
    const direct = sections[section];
    const folded = sections[`fold:${section}/summary`] || sections[`fold:${section}/full`];
    const body = direct || folded;
    if (!body || !body.some((line) => line.trim())) {
      throw new Error(`missing or empty required section: [${section}]`);
    }
  }

  return { headers, sections };
}

export function inspectCrumb(text) {
  try {
    const parsed = parseCrumb(text);
    return {
      ok: true,
      title: parsed.headers.title || "Untitled CRUMB",
      kind: parsed.headers.kind,
      version: parsed.headers.v,
      source: parsed.headers.source,
      id: parsed.headers.id || null,
      bytes: new TextEncoder().encode(text).length,
      sectionNames: Object.keys(parsed.sections),
      parsed,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function assertCrumb(text) {
  const result = inspectCrumb(text);
  if (!result.ok) throw new Error(`Invalid CRUMB: ${result.error}`);
  return result;
}
