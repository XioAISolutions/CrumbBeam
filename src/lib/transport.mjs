import { LTDecoder, LTEncoder } from "./fountain.mjs";
import {
  FRAME_HEADER_LENGTH,
  MAX_ENVELOPE_BYTES,
  fnv1a,
  packFrame,
  parseFrame,
} from "./protocol.mjs";

const DEFAULT_SESSION_TIMEOUT_MS = 120_000;

export class BeamSender {
  constructor(payload, options = {}) {
    this.payload = payload instanceof Uint8Array ? payload : new Uint8Array(payload);
    if (this.payload.byteLength < 1 || this.payload.byteLength > MAX_ENVELOPE_BYTES) {
      throw new Error("payload exceeds CrumbBeam optical limit");
    }
    this.frameBytes = options.frameBytes || 1200;
    this.blockLength = this.frameBytes - FRAME_HEADER_LENGTH;
    this.sessionId = options.sessionId || randomSessionId();
    this.encoder = new LTEncoder(this.payload, this.blockLength, this.sessionId);
    this.payloadFnv = fnv1a(this.payload);
    this.sequence = 0;
  }

  nextFrame() {
    const sequence = this.sequence++;
    return packFrame({
      sessionId: this.sessionId,
      sequence,
      blockCount: this.encoder.blockCount,
      blockLength: this.blockLength,
      totalLength: this.payload.byteLength,
      payloadFnv: this.payloadFnv,
    }, this.encoder.encode(sequence));
  }

  get stats() {
    return {
      sessionId: this.sessionId,
      blockCount: this.encoder.blockCount,
      blockLength: this.blockLength,
      totalLength: this.payload.byteLength,
      sequence: this.sequence,
    };
  }
}

export class BeamReceiver {
  constructor(options = {}) {
    this.sessionTimeoutMs = options.sessionTimeoutMs || DEFAULT_SESSION_TIMEOUT_MS;
    this.now = options.now || (() => Date.now());
    this.reset();
  }

  reset() {
    this.decoder = null;
    this.sessionId = null;
    this.payloadFnv = null;
    this.completePayload = null;
    this.sessionStartedAt = null;
  }

  add(bytes) {
    const parsed = parseFrame(bytes);
    if (!parsed) return { accepted: false, reason: "not-a-crumbbeam-frame" };
    const { header, block } = parsed;

    if (this.decoder && this.sessionId === header.sessionId && this.now() - this.sessionStartedAt > this.sessionTimeoutMs) {
      this.reset();
      return { accepted: false, reason: "session-expired" };
    }

    if (!this.decoder || this.sessionId !== header.sessionId) {
      try {
        this.decoder = new LTDecoder(header.blockCount, header.blockLength, header.sessionId, header.totalLength);
      } catch {
        this.reset();
        return { accepted: false, reason: "unsafe-session-parameters" };
      }
      this.sessionId = header.sessionId;
      this.payloadFnv = header.payloadFnv;
      this.completePayload = null;
      this.sessionStartedAt = this.now();
    }

    if (
      header.blockCount !== this.decoder.blockCount ||
      header.blockLength !== this.decoder.blockLength ||
      header.totalLength !== this.decoder.totalLength ||
      header.payloadFnv !== this.payloadFnv
    ) {
      return { accepted: false, reason: "session-parameters-changed" };
    }

    if (!this.decoder.addFrame(header.sequence, block)) {
      if (this.decoder.seen.size >= this.decoder.maxFrames) this.reset();
      return { accepted: false, reason: "session-frame-budget-exhausted" };
    }

    if (this.decoder.isComplete && !this.completePayload) {
      const payload = this.decoder.assemble();
      if (fnv1a(payload) !== this.payloadFnv) {
        this.reset();
        return { accepted: false, reason: "payload-integrity-failed" };
      }
      this.completePayload = payload;
    }

    return {
      accepted: true,
      complete: Boolean(this.completePayload),
      payload: this.completePayload,
      framesNew: this.decoder.framesNew,
      framesDuplicate: this.decoder.framesDuplicate,
      framesRejected: this.decoder.framesRejected,
      blockCount: this.decoder.blockCount,
      solvedCount: this.decoder.solvedCount,
      progress: Math.min(0.99, this.decoder.framesNew / Math.max(1, this.decoder.blockCount * 1.18)),
    };
  }
}

function randomSessionId() {
  const out = new Uint32Array(1);
  globalThis.crypto.getRandomValues(out);
  return out[0] || 1;
}
