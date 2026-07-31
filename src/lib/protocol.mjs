export const FRAME_HEADER_LENGTH = 24;
export const MIN_BLOCK_LENGTH = 32;
export const MAX_BLOCK_LENGTH = 4096;
export const MAX_ENVELOPE_BYTES = 20 * 1024 * 1024 + 256 * 1024;
export const MAX_BLOCK_COUNT = 65_535;
export const MAX_PADDED_BYTES = MAX_ENVELOPE_BYTES + MAX_BLOCK_LENGTH;
export const MAX_SESSION_FRAMES = 100_000;

const MAGIC0 = 0x43;
const MAGIC1 = 0x42;
const VERSION = 1;

export function fnv1a(bytes) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.byteLength; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function splitmix32(seed) {
  let state = seed | 0;
  return () => {
    state = (state + 0x9e3779b9) | 0;
    let value = state ^ (state >>> 16);
    value = Math.imul(value, 0x21f0aaad);
    value ^= value >>> 15;
    value = Math.imul(value, 0x735a2d97);
    value ^= value >>> 15;
    return value >>> 0;
  };
}

export function validateFrameHeader(header) {
  if (!Number.isInteger(header.sessionId) || header.sessionId <= 0 || header.sessionId > 0xffffffff) {
    return "invalid-session-id";
  }
  if (!Number.isInteger(header.sequence) || header.sequence < 0 || header.sequence > 0xffffffff) {
    return "invalid-sequence";
  }
  if (!Number.isInteger(header.blockCount) || header.blockCount < 1 || header.blockCount > MAX_BLOCK_COUNT) {
    return "invalid-block-count";
  }
  if (!Number.isInteger(header.blockLength) || header.blockLength < MIN_BLOCK_LENGTH || header.blockLength > MAX_BLOCK_LENGTH) {
    return "invalid-block-length";
  }
  if (!Number.isInteger(header.totalLength) || header.totalLength < 1 || header.totalLength > MAX_ENVELOPE_BYTES) {
    return "invalid-total-length";
  }
  if (!Number.isInteger(header.payloadFnv) || header.payloadFnv < 0 || header.payloadFnv > 0xffffffff) {
    return "invalid-payload-integrity";
  }

  const paddedLength = header.blockCount * header.blockLength;
  const previousBoundary = (header.blockCount - 1) * header.blockLength;
  if (!Number.isSafeInteger(paddedLength) || paddedLength > MAX_PADDED_BYTES) {
    return "padded-payload-too-large";
  }
  if (header.totalLength > paddedLength || header.totalLength <= previousBoundary) {
    return "inconsistent-block-geometry";
  }
  return null;
}

export function packFrame(header, block) {
  const validationError = validateFrameHeader(header);
  if (validationError) throw new Error(`invalid frame header: ${validationError}`);
  if (!(block instanceof Uint8Array)) block = new Uint8Array(block);
  if (block.byteLength !== header.blockLength) throw new Error("block length mismatch");

  const out = new Uint8Array(FRAME_HEADER_LENGTH + block.byteLength);
  const view = new DataView(out.buffer);
  view.setUint8(0, MAGIC0);
  view.setUint8(1, MAGIC1);
  view.setUint8(2, VERSION);
  view.setUint8(3, 0);
  view.setUint32(4, header.sessionId >>> 0, true);
  view.setUint32(8, header.sequence >>> 0, true);
  view.setUint16(12, header.blockCount, true);
  view.setUint16(14, header.blockLength, true);
  view.setUint32(16, header.totalLength >>> 0, true);
  view.setUint32(20, header.payloadFnv >>> 0, true);
  out.set(block, FRAME_HEADER_LENGTH);
  return out;
}

export function parseFrame(bytes) {
  if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
  if (bytes.byteLength <= FRAME_HEADER_LENGTH || bytes.byteLength > FRAME_HEADER_LENGTH + MAX_BLOCK_LENGTH) return null;
  if (bytes[0] !== MAGIC0 || bytes[1] !== MAGIC1 || bytes[2] !== VERSION) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const header = {
    sessionId: view.getUint32(4, true),
    sequence: view.getUint32(8, true),
    blockCount: view.getUint16(12, true),
    blockLength: view.getUint16(14, true),
    totalLength: view.getUint32(16, true),
    payloadFnv: view.getUint32(20, true),
  };
  if (validateFrameHeader(header)) return null;
  if (bytes.byteLength !== FRAME_HEADER_LENGTH + header.blockLength) return null;
  return { header, block: bytes.slice(FRAME_HEADER_LENGTH) };
}
