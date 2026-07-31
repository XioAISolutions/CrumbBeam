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

Attackers may present very large or inconsistent frame parameters. Implementations must bound payload sizes, validate lengths before allocation, cap worker counts, and reset malformed sessions. The browser envelope currently caps original CRUMBs at 20 MB.

### Compromised browser or dependency

CrumbBeam depends on browser Web Crypto, `qrcode`, and `zxing-wasm`. A compromised runtime can read unencrypted payloads and passphrases. Production deployments should pin dependencies, use lockfiles, enforce CSP, and serve reviewed builds.

## Non-goals

CrumbBeam does not provide sender identity, non-repudiation, traffic concealment, protection from a compromised endpoint, deniable communication, automatic trust in received agent instructions, or guaranteed resistance to high-budget passphrase cracking.
