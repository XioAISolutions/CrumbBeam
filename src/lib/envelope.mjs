import { assertCrumb } from "./crumb.mjs";
import { bytesEqual, concatBytes, randomBytes } from "./bytes.mjs";

const MAGIC = new Uint8Array([0x43, 0x42, 0x4d, 0x31]);
const VERSION = 1;
const FIXED_HEADER = 56;
const FLAG_COMPRESSED = 1;
const FLAG_ENCRYPTED = 2;
const MAX_PAYLOAD = 20 * 1024 * 1024;
const PBKDF2_ITERATIONS = 200_000;

function getCrypto() {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto is unavailable in this environment");
  return globalThis.crypto;
}

async function sha256(bytes) {
  const digest = await getCrypto().subtle.digest("SHA-256", bytes);
  return new Uint8Array(digest);
}

async function compress(bytes) {
  if (typeof CompressionStream === "undefined") return null;
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function decompress(bytes) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot decompress a CrumbBeam envelope");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function deriveKey(passphrase, salt) {
  const subtle = getCrypto().subtle;
  const material = await subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function packCrumbEnvelope(text, options = {}) {
  const info = assertCrumb(text);
  const original = new TextEncoder().encode(text);
  if (original.byteLength > MAX_PAYLOAD) throw new Error("CRUMB exceeds the 20 MB safety limit");

  let payload = original;
  let flags = 0;
  if (options.compress !== false) {
    const compressed = await compress(original);
    if (compressed && compressed.byteLength + 32 < original.byteLength) {
      payload = compressed;
      flags |= FLAG_COMPRESSED;
    }
  }

  let salt = new Uint8Array();
  let iv = new Uint8Array();
  if (options.passphrase) {
    salt = randomBytes(16);
    iv = randomBytes(12);
    const key = await deriveKey(options.passphrase, salt);
    const encrypted = await getCrypto().subtle.encrypt({ name: "AES-GCM", iv }, key, payload);
    payload = new Uint8Array(encrypted);
    flags |= FLAG_ENCRYPTED;
  }

  const metadata = {
    mediaType: "application/vnd.crumb+text",
    filename: options.filename || `${sanitizeFilename(info.title)}.crumb`,
    title: info.title,
    kind: info.kind,
    crumbVersion: info.version,
    source: info.source,
    createdAt: new Date().toISOString(),
    transportProfile: "optical-fountain-qr-v1",
  };
  const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
  const digest = await sha256(original);

  const header = new Uint8Array(FIXED_HEADER);
  header.set(MAGIC, 0);
  const view = new DataView(header.buffer);
  view.setUint8(4, VERSION);
  view.setUint8(5, flags);
  view.setUint16(6, FIXED_HEADER, true);
  view.setUint32(8, metadataBytes.byteLength, true);
  view.setUint32(12, payload.byteLength, true);
  view.setUint32(16, original.byteLength, true);
  view.setUint8(20, salt.byteLength);
  view.setUint8(21, iv.byteLength);
  view.setUint16(22, PBKDF2_ITERATIONS / 1000, true);
  header.set(digest, 24);

  return concatBytes(header, salt, iv, metadataBytes, payload);
}

export function inspectEnvelope(bytes) {
  if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
  if (bytes.byteLength < FIXED_HEADER) throw new Error("envelope is too short");
  for (let i = 0; i < MAGIC.length; i++) {
    if (bytes[i] !== MAGIC[i]) throw new Error("invalid CrumbBeam envelope magic");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const version = view.getUint8(4);
  if (version !== VERSION) throw new Error(`unsupported CrumbBeam envelope version: ${version}`);
  const flags = view.getUint8(5);
  const headerLength = view.getUint16(6, true);
  const metadataLength = view.getUint32(8, true);
  const payloadLength = view.getUint32(12, true);
  const originalLength = view.getUint32(16, true);
  const saltLength = view.getUint8(20);
  const ivLength = view.getUint8(21);
  const digest = bytes.slice(24, 56);
  const expected = headerLength + saltLength + ivLength + metadataLength + payloadLength;
  if (expected !== bytes.byteLength) throw new Error("envelope length fields do not match payload");
  let offset = headerLength;
  const salt = bytes.slice(offset, (offset += saltLength));
  const iv = bytes.slice(offset, (offset += ivLength));
  const metadataBytes = bytes.slice(offset, (offset += metadataLength));
  let metadata;
  try {
    metadata = JSON.parse(new TextDecoder().decode(metadataBytes));
  } catch {
    throw new Error("invalid envelope metadata JSON");
  }
  const payload = bytes.slice(offset, offset + payloadLength);
  return { version, compressed: Boolean(flags & FLAG_COMPRESSED), encrypted: Boolean(flags & FLAG_ENCRYPTED), originalLength, digest, salt, iv, metadata, payload };
}

export async function unpackCrumbEnvelope(bytes, options = {}) {
  const envelope = inspectEnvelope(bytes);
  let payload = envelope.payload;

  if (envelope.encrypted) {
    if (!options.passphrase) throw new Error("This beam is encrypted; enter its passphrase");
    const key = await deriveKey(options.passphrase, envelope.salt);
    try {
      const clear = await getCrypto().subtle.decrypt({ name: "AES-GCM", iv: envelope.iv }, key, payload);
      payload = new Uint8Array(clear);
    } catch {
      throw new Error("Could not decrypt beam: passphrase is wrong or payload was modified");
    }
  }

  if (envelope.compressed) payload = await decompress(payload);
  if (payload.byteLength !== envelope.originalLength) throw new Error("unpacked payload length does not match envelope metadata");
  const digest = await sha256(payload);
  if (!bytesEqual(digest, envelope.digest)) throw new Error("SHA-256 verification failed");

  const text = new TextDecoder().decode(payload);
  const crumb = assertCrumb(text);
  return { text, crumb, metadata: envelope.metadata, digest };
}

function sanitizeFilename(value) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "handoff";
}
