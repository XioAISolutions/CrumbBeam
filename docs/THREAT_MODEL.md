# Threat Model

## Assets

- confidentiality of CRUMB context;
- byte-for-byte integrity of the received handoff;
- correct separation of optical sessions;
- host application authority and approval boundaries;
- camera privacy and user intent.

## Adversaries

### Nearby observer

A person able to see or record the sending screen can capture frames. Optional passphrase encryption is the mitigation. A short or reused passphrase remains vulnerable to offline guessing because the entire encrypted envelope can be recorded.

### Optical injector

A person can display competing CrumbBeam frames to the receiving camera. Session IDs reduce accidental mixing, while FNV, AES-GCM, SHA-256, and CRUMB validation detect mismatched reconstruction. They do not authenticate the human sender.

### Malicious CRUMB author

A structurally valid CRUMB may contain dangerous requests, misleading source claims, paths, URLs, or `[script]` content. CrumbBeam never executes received content. Integrators must preserve system/developer authority and require approval for privileged tools.

### Resource exhaustion

An attacker may present large or inconsistent frame parameters, endless unique sequence numbers, or a session that never becomes solvable.

The browser receiver now rejects these values before decoder allocation:

- blocks smaller than 32 bytes or larger than 4,096 bytes;
- envelopes beyond the documented 20 MiB plus bounded envelope overhead;
- block geometry that does not equal `ceil(totalLength / blockLength)`;
- padded source storage above the envelope limit plus one block;
- malformed session IDs, sequence values, or integrity fields.

During decoding it also caps distinct frames, pending equations, worker count, and session lifetime. A normal session receives a budget of roughly six times its source-block count, with an absolute ceiling of 100,000 distinct frames and a 120-second lifetime. Budget exhaustion rejects or resets that session so a later valid session can still start.

These application checks reduce risk but do not replace browser process isolation, dependency review, a restrictive Content Security Policy, or OS-level memory controls.

### Compromised browser or dependency

CrumbBeam depends on browser Web Crypto, `qrcode`, and `zxing-wasm`. A compromised runtime can read unencrypted payloads and passphrases. Production deployments should pin dependencies, use lockfiles, enforce CSP, and serve reviewed builds.

## Non-goals

CrumbBeam does not provide sender identity, non-repudiation, traffic concealment, protection from a compromised endpoint, deniable communication, automatic trust in received agent instructions, or guaranteed resistance to high-budget passphrase cracking.
