const DEFAULT_TTL_MS = 5 * 60 * 1000;

export class VolatileEnvelope {
  constructor(options = {}) {
    this.ttlMs = options.ttlMs || DEFAULT_TTL_MS;
    this.now = options.now || (() => Date.now());
    this.setTimer = options.setTimer || ((callback, delay) => setTimeout(callback, delay));
    this.clearTimer = options.clearTimer || ((timer) => clearTimeout(timer));
    this.bytes = null;
    this.expiresAt = null;
    this.timer = null;
  }

  get hasValue() {
    this.#expireIfNeeded();
    return Boolean(this.bytes);
  }

  retain(bytes) {
    if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
    if (!bytes.byteLength) throw new Error("cannot retain an empty envelope");
    this.discard();
    this.bytes = bytes.slice();
    this.expiresAt = this.now() + this.ttlMs;
    this.timer = this.setTimer(() => this.discard(), this.ttlMs);
  }

  peek() {
    this.#expireIfNeeded();
    return this.bytes;
  }

  discard() {
    if (this.timer !== null) this.clearTimer(this.timer);
    this.timer = null;
    if (this.bytes) this.bytes.fill(0);
    this.bytes = null;
    this.expiresAt = null;
  }

  #expireIfNeeded() {
    if (this.bytes && this.expiresAt !== null && this.now() >= this.expiresAt) this.discard();
  }
}
