// LT fountain code adapted for CrumbBeam's one-way optical channel.
// The robust-soliton design and deterministic-log workaround are informed by
// bashalarmistalt/decimen-optical-transfer (MIT); see NOTICE and docs/PROTOCOL.md.

import { splitmix32 } from "./protocol.mjs";

const LN2 = 0.6931471805599453;
const SOLITON_C = 0.1;
const SOLITON_DELTA = 0.5;

function deterministicLog(x) {
  let exponent = 0;
  let mantissa = x;
  while (mantissa >= 1.5) { mantissa /= 2; exponent++; }
  while (mantissa < 0.75) { mantissa *= 2; exponent--; }
  const z = (mantissa - 1) / (mantissa + 1);
  const z2 = z * z;
  let term = z;
  let sum = 0;
  for (let n = 1; n <= 21; n += 2) { sum += term / n; term *= z2; }
  return exponent * LN2 + 2 * sum;
}

function solitonCdf(k) {
  const cdf = new Float64Array(k);
  if (k === 1) { cdf[0] = 1; return cdf; }
  const r = Math.max(1, SOLITON_C * deterministicLog(k / SOLITON_DELTA) * Math.sqrt(k));
  const spike = Math.min(k, Math.ceil(k / r));
  let total = 0;
  for (let degree = 1; degree <= k; degree++) {
    const rho = degree === 1 ? 1 / k : 1 / (degree * (degree - 1));
    let tau = 0;
    if (degree < spike) tau = r / (degree * k);
    else if (degree === spike) tau = (r * Math.max(0, deterministicLog(r / SOLITON_DELTA))) / k;
    total += rho + tau;
    cdf[degree - 1] = total;
  }
  for (let i = 0; i < k; i++) cdf[i] /= total;
  cdf[k - 1] = 1;
  return cdf;
}

function frameSeed(sessionId, sequence) {
  let hash = (Math.imul(sessionId + 1, 0x9e3779b1) ^ (sequence + 0x85ebca6b)) | 0;
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  return (hash ^ (hash >>> 16)) | 0;
}

function frameIndices(k, cdf, sessionId, sequence) {
  const random = splitmix32(frameSeed(sessionId, sequence));
  const u = random() * 2 ** -32;
  let low = 0;
  let high = k - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (cdf[mid] >= u) high = mid;
    else low = mid + 1;
  }
  const degree = Math.min(k, low + 1);
  if (degree > k >> 3) {
    const scratch = new Uint32Array(k);
    for (let i = 0; i < k; i++) scratch[i] = i;
    const out = new Array(degree);
    for (let i = 0; i < degree; i++) {
      const j = i + (random() % (k - i));
      const tmp = scratch[i]; scratch[i] = scratch[j]; scratch[j] = tmp;
      out[i] = scratch[i];
    }
    return out;
  }
  const selected = new Set();
  while (selected.size < degree) selected.add(random() % k);
  return [...selected];
}

function xorInto(target, source) {
  for (let i = 0; i < target.length; i++) target[i] = (target[i] ^ source[i]) >>> 0;
}

export class LTEncoder {
  constructor(payload, blockLength, sessionId) {
    if (!(payload instanceof Uint8Array)) payload = new Uint8Array(payload);
    if (blockLength < 32 || blockLength > 4096) throw new Error("blockLength must be 32..4096 bytes");
    this.blockLength = blockLength;
    this.sessionId = sessionId >>> 0;
    this.blockCount = Math.max(1, Math.ceil(payload.byteLength / blockLength));
    this.words = Math.ceil(blockLength / 4);
    this.blocks = new Uint32Array(this.blockCount * this.words);
    const bytes = new Uint8Array(this.blocks.buffer);
    for (let block = 0; block < this.blockCount; block++) {
      const start = block * blockLength;
      bytes.set(payload.slice(start, Math.min(start + blockLength, payload.byteLength)), block * this.words * 4);
    }
    this.cdf = solitonCdf(this.blockCount);
  }

  encode(sequence) {
    const indices = frameIndices(this.blockCount, this.cdf, this.sessionId, sequence);
    const output = new Uint32Array(this.words);
    for (const block of indices) {
      const offset = block * this.words;
      for (let word = 0; word < this.words; word++) output[word] = (output[word] ^ this.blocks[offset + word]) >>> 0;
    }
    return new Uint8Array(output.buffer, 0, this.blockLength);
  }
}

export class LTDecoder {
  constructor(blockCount, blockLength, sessionId, totalLength) {
    this.blockCount = blockCount;
    this.blockLength = blockLength;
    this.sessionId = sessionId >>> 0;
    this.totalLength = totalLength;
    this.words = Math.ceil(blockLength / 4);
    this.cdf = solitonCdf(blockCount);
    this.solved = new Array(blockCount).fill(null);
    this.byBlock = new Map();
    this.pending = new Set();
    this.seen = new Set();
    this.solvedCount = 0;
    this.framesNew = 0;
    this.framesDuplicate = 0;
  }

  get isComplete() { return this.solvedCount === this.blockCount; }

  addFrame(sequence, block) {
    if (this.seen.has(sequence)) { this.framesDuplicate++; return; }
    this.seen.add(sequence);
    this.framesNew++;
    if (this.isComplete) return;
    const indices = new Set(frameIndices(this.blockCount, this.cdf, this.sessionId, sequence));
    const words = new Uint32Array(this.words);
    new Uint8Array(words.buffer).set(block.slice(0, this.blockLength));
    for (const index of [...indices]) {
      const solved = this.solved[index];
      if (solved) { xorInto(words, solved); indices.delete(index); }
    }
    if (indices.size === 0) return;
    if (indices.size === 1) { this.#resolve(indices.values().next().value, words); return; }
    this.#addPending({ indices, words });
  }

  #addPending(frame) {
    this.pending.add(frame);
    for (const index of frame.indices) {
      let waiting = this.byBlock.get(index);
      if (!waiting) { waiting = new Set(); this.byBlock.set(index, waiting); }
      waiting.add(frame);
    }
  }

  #removePending(frame) {
    if (!this.pending.delete(frame)) return;
    for (const index of frame.indices) {
      const waiting = this.byBlock.get(index);
      waiting?.delete(frame);
      if (waiting?.size === 0) this.byBlock.delete(index);
    }
  }

  #resolve(firstIndex, firstWords) {
    const queue = [[firstIndex, firstWords]];
    while (queue.length) {
      const [index, words] = queue.pop();
      if (this.solved[index]) continue;
      this.solved[index] = words;
      this.solvedCount++;
      const waitingFrames = [...(this.byBlock.get(index) || [])];
      this.byBlock.delete(index);
      for (const frame of waitingFrames) {
        if (!this.pending.has(frame) || !frame.indices.has(index)) continue;
        this.#removePending(frame);
        xorInto(frame.words, words);
        frame.indices.delete(index);
        if (frame.indices.size === 0) continue;
        if (frame.indices.size === 1) queue.push([frame.indices.values().next().value, frame.words]);
        else this.#addPending(frame);
      }
    }
  }

  assemble() {
    if (!this.isComplete) return null;
    const padded = new Uint8Array(this.blockCount * this.blockLength);
    for (let block = 0; block < this.blockCount; block++) {
      const bytes = new Uint8Array(this.solved[block].buffer, 0, this.blockLength);
      padded.set(bytes, block * this.blockLength);
    }
    return padded.slice(0, this.totalLength);
  }
}
