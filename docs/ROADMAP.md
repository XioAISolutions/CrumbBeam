# Roadmap

## v0.1 — visible proof

- [x] one valid CRUMB in;
- [x] versioned envelope;
- [x] optional compression and encryption;
- [x] fountain-coded animated QR sender;
- [x] camera + WASM receiver;
- [x] verification and copy/download;
- [x] deterministic unit tests;
- [ ] hardware test matrix across iPhone, Android, laptop, and tablet;
- [ ] first uninterrupted demo video.

## v0.2 — reliable product

- recorded optical fixtures for regression tests;
- automatic frame-size calibration;
- visible camera focus and exposure guidance;
- passphrase confirmation and strength guidance;
- CRUMB pack support with manifest and per-file hashes;
- resumable receive sessions in volatile memory;
- PWA install and fully offline static assets;
- Content Security Policy and dependency lockfile;
- accessibility and keyboard audit.

## v0.3 — ecosystem adapter

- `crumb beam send` and `crumb beam receive` launcher integration;
- transport receipts emitted as CRUMBs;
- direct handoff to CrumbContext after reception;
- optional AgentAuth sender signatures, kept separate from encryption;
- local MCP tool that prepares a beam without exposing camera permissions to the model;
- native deep-link and import adapters where host platforms permit them.

## Research track

- multi-code grids;
- color channels with explicit calibration and error bounds;
- rateless Raptor/RQ comparison;
- webcam-to-webcam bidirectional acknowledgements where available;
- optical transfer performance corpus with reproducible device metadata;
- accessibility alternatives for users unable to operate a camera.
