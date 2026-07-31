# Security Policy

## Supported versions

CrumbBeam is an early-stage project. Only the latest commit on `main` is
currently supported for security fixes.

## Reporting a vulnerability

Do not publish working exploit details in a public issue. Contact XIO AI
Solutions through the contact information on its official site and include:

- affected commit or release;
- browser and operating system;
- reproduction steps;
- whether confidentiality, integrity, availability, or agent authority is affected;
- a minimal proof that avoids exposing real CRUMB payloads.

## High-priority classes

Please report these immediately:

- envelope parsing that permits out-of-bounds reads or memory exhaustion;
- decryption that accepts a modified AES-GCM payload;
- SHA-256 verification bypass;
- cross-session frame confusion that reconstructs a mixed payload;
- received content that executes without an explicit host approval step;
- secrets written to local storage, logs, URLs, or analytics;
- camera activation without a visible user action;
- cross-origin requests or uploads not clearly initiated by the user.

## Integration rule

A valid, decrypted, hash-verified CRUMB is still **untrusted input**. Verification
proves transport integrity, not the identity or authority of the sender. Agent
runtimes must apply their own policy, sandbox, and human-approval controls.
