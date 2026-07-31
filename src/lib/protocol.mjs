export const FRAME_HEADER_LENGTH = 24;
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

export function packFrame(header, block) {
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
  if (bytes.byteLength <= FRAME_HEADER_LENGTH) return null;
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
  if (!header.sessionId || !header.blockCount || !header.blockLength || !header.totalLength) return null;
  if (bytes.byteLength !== FRAME_HEADER_LENGTH + header.blockLength) return null;
  return { header, block: bytes.slice(FRAME_HEADER_LENGTH) };
}
