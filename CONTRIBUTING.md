# Contributing to CrumbBeam

CrumbBeam should remain easy to understand in one sitting. Contributions are
most useful when they improve one of four measurable properties:

1. transfer reliability;
2. payload safety and verification;
3. compatibility across browsers/devices;
4. the speed with which a new user can complete a first beam.

## Local checks

```bash
npm install
npm run check
```

Core changes should include deterministic tests. Optical changes should include
a written fixture/device matrix: sender display, receiver device, browser,
distance, lighting, frame size, frame rate, payload size, completion time, and
whether the result passed SHA-256 verification.

## Claim discipline

Do not turn device-specific measurements into universal claims. Report the
complete setup and distinguish:

- optical frame throughput;
- useful envelope goodput;
- time to first decoded frame;
- total time to verified CRUMB;
- success rate across repeated runs.

## Pull requests

Keep PRs focused. Explain the failure mode, the change, evidence, compatibility
impact, and rollback path. Never include real client CRUMBs, credentials, or
private camera footage in fixtures.
