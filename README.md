<div align="center">

# CrumbBeam

**Beam verified AI context between offline devices using only a screen and camera.**

[![CI](https://github.com/XioAISolutions/CrumbBeam/actions/workflows/ci.yml/badge.svg)](https://github.com/XioAISolutions/CrumbBeam/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-5de5ff.svg)](LICENSE)
[![CRUMB v1.4](https://img.shields.io/badge/CRUMB-v1.4-b9ff66.svg)](https://github.com/XioAISolutions/crumb-format)

**No account · No pairing · No cloud · No direct network path**

</div>

---

## The ten-second explanation

CRUMB gives an AI the goal, context, constraints, checks, and next actions needed to continue work. CrumbBeam packages that handoff, verifies it, and transmits it as an endless stream of animated QR frames. A second device points its camera at the screen and reconstructs the handoff even when frames are missed or arrive out of order.

> **CRUMB defines the message. CrumbBeam delivers it.**

## Try it

```bash
npm install
npm run dev
```

Vite prints secure local and network URLs.

1. Open the sender on a laptop or tablet.
2. Paste a valid CRUMB or load `examples/demo.crumb`.
3. Select **Beam this CRUMB**.
4. Open `?mode=receive` on the receiving phone using the secure network URL.
5. Start the camera and point it at the animated code.
6. Copy or download the verified CRUMB after reconstruction.

The camera requires a secure browser context. The development server therefore uses a self-signed HTTPS certificate. A browser warning is expected on first use in local development.

## What is working in v0.1

- strict structural validation for common CRUMB kinds;
- a versioned `CBM1` binary envelope;
- optional gzip compression when it meaningfully reduces size;
- optional passphrase encryption using PBKDF2-SHA-256 and AES-256-GCM;
- full SHA-256 verification of the original CRUMB after decryption and decompression;
- self-describing optical frames with session, sequence, block, length, and payload-integrity data;
- Luby Transform fountain coding for one-way, loss-tolerant transmission;
- binary QR rendering in the browser;
- portable QR decoding through `zxing-wasm`, including Safari;
- worker-based camera decoding so slow frames are discarded rather than blocking capture;
- automatic CRUMB validation after reception;
- local copy and `.crumb` download actions;
- deterministic core tests for format, envelope, frame protocol, encryption, and fountain recovery.

## Why fountain coding matters

A screen-to-camera channel has no useful back-channel. The receiving phone cannot ask the sender to retransmit frame 37 after motion blur or autofocus causes it to miss that frame.

CrumbBeam therefore does not send source blocks sequentially. Every frame is the XOR of a deterministic pseudorandom subset of source blocks. The receiver can reconstruct the payload from a sufficient set of **any distinct frames**:

```text
CRUMB text
    │
    ▼
validate → compress → encrypt → SHA-256 envelope
    │
    ▼
source blocks ──▶ endless LT fountain frames
    │
    ▼
animated binary QR codes
    │               light
    └────────────────────────▶ camera
                               │
                               ▼
                     QR workers discard failures
                               │
                               ▼
                     fountain peeling decoder
                               │
                               ▼
                    decrypt → decompress → verify
                               │
                               ▼
                       validated CRUMB handoff
```

Dropped frames increase transfer time; they do not create a partially corrupted output. The final envelope still must pass SHA-256 verification and CRUMB validation.

## Architecture

```text
src/
├── main.js                 browser sender and receiver controller
├── styles.css              responsive product UI
├── workers/
│   └── qr-worker.js        ZXing-WASM QR decoding worker
└── lib/
    ├── crumb.mjs           CRUMB structural inspection
    ├── envelope.mjs        compression, encryption, metadata, SHA-256
    ├── protocol.mjs        self-describing optical frame wire format
    ├── fountain.mjs        deterministic LT encoder and decoder
    ├── transport.mjs       sender and receiver state machines
    └── bytes.mjs           byte helpers and constant-time equality
```

The repository deliberately separates concerns:

| Project | Responsibility |
|---|---|
| [`crumb-format`](https://github.com/XioAISolutions/crumb-format) | canonical portable AI handoff format |
| [`CrumbContext`](https://github.com/XioAISolutions/CrumbContext) | protect and route the right context before transport |
| **CrumbBeam** | package and physically transport CRUMBs over an optical channel |
| [`CrumbLLM`](https://github.com/XioAISolutions/CrumbLLM) | reason over the received CRUMB or CRUMB pack |

CrumbBeam is an adapter. It does not redefine the CRUMB grammar or elevate transport metadata above the contents of the handoff.

## Security model

CrumbBeam is designed for **offline transfer**, not anonymous communication or concealment.

- Payload data stays in browser memory during the transfer.
- Encryption is optional and independent of QR and fountain coding.
- AES-GCM authenticates encrypted payloads.
- SHA-256 authenticates the unpacked CRUMB against the sender's envelope.
- The fast FNV-1a value in optical frames detects reconstruction mismatch before envelope processing; it is not cryptographic authentication.
- A received CRUMB is data, not trusted instructions for the host application.
- Applications importing received CRUMBs must preserve their own authority, approval, and tool-execution rules.

Read [SECURITY.md](SECURITY.md) and [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) before integrating CrumbBeam into a privileged agent runtime.

## Performance controls

| Setting | Default | Trade-off |
|---|---:|---|
| frame rate | 24 FPS | lower rates tolerate slower displays and cameras |
| frame bytes | 1000 | smaller QR codes decode at greater distance |
| QR ECC | L, fixed | QR handles corruption; fountain coding handles dropped frames |

The optimal values depend on display refresh rate, camera resolution, focus, brightness, distance, and device thermals. CrumbBeam estimates progress from distinct fountain frames rather than blocks solved because LT decoding often completes in a late peeling cascade.

## Development

```bash
npm test          # deterministic core tests, no camera required
npm run build     # production Vite build
npm run check     # tests + build
```

The core tests simulate out-of-order delivery with 20% frame loss and confirm byte-for-byte payload recovery. Browser-level camera tests remain a roadmap item because they require real display and camera hardware or recorded optical fixtures.

## Protocol and compatibility

- Envelope: `CBM1`, version 1.
- Optical frame: `CB`, version 1, little-endian fields.
- Transport profile: `optical-fountain-qr-v1`.
- Payload media type: `application/vnd.crumb+text`.

See [docs/PROTOCOL.md](docs/PROTOCOL.md) for exact byte layouts and compatibility rules.

## Launch demo

The launch claim should remain narrow and visually provable:

> **We transferred an AI's working context between two offline devices using only light.**

Record one uninterrupted shot showing:

1. a task in one AI;
2. `crumb it` producing the handoff;
3. CrumbBeam validating and beaming it;
4. a phone reconstructing it from the screen;
5. the received title, goal, constraints, and verified status;
6. the second AI continuing the task.

The complete launch checklist and copy are in [docs/LAUNCH.md](docs/LAUNCH.md).

## Scope boundaries

CrumbBeam does **not** currently transfer an entire repository automatically, execute received `[script]` content, prove sender identity, hide that a transfer is happening, replace secure removable media for very large payloads, or claim that optical QR transfer was invented here.

## Attribution

The optical architecture and several hard-won implementation lessons are informed by [`bashalarmistalt/decimen-optical-transfer`](https://github.com/bashalarmistalt/decimen-optical-transfer), an MIT-licensed screen-to-camera file-transfer proof of concept using animated QR codes and LT fountain coding. CrumbBeam adds CRUMB validation, a versioned AI-context envelope, optional authenticated encryption, SHA-256 verification, receiving UX, and CRUMB ecosystem integration.

See [NOTICE](NOTICE) for attribution and the boundaries of reused or adapted concepts.

## License

MIT © XIO AI Solutions. See [LICENSE](LICENSE).
