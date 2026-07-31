# CrumbBeam Protocol v1

CrumbBeam has three distinct layers:

1. the CRUMB payload;
2. the `CBM1` authenticated envelope;
3. the `CB` optical fountain frame.

Keeping these separate prevents transport choices from redefining CRUMB semantics and lets future transports reuse the same envelope.

## 1. Payload

Version 1 carries one UTF-8 CRUMB document with media type `application/vnd.crumb+text`. The sender validates the CRUMB before packing. The receiver validates it again after decryption, decompression, and SHA-256 verification.

## 2. CBM1 envelope

All integer fields are little-endian.

| Offset | Size | Field |
|---:|---:|---|
| 0 | 4 | ASCII magic `CBM1` |
| 4 | 1 | envelope version (`1`) |
| 5 | 1 | flags: bit 0 gzip, bit 1 AES-GCM |
| 6 | 2 | fixed header length (`56`) |
| 8 | 4 | metadata JSON byte length |
| 12 | 4 | processed payload byte length |
| 16 | 4 | original CRUMB byte length |
| 20 | 1 | PBKDF2 salt byte length |
| 21 | 1 | AES-GCM IV byte length |
| 22 | 2 | PBKDF2 iterations divided by 1000 |
| 24 | 32 | SHA-256 of original UTF-8 CRUMB bytes |
| 56 | variable | salt, IV, metadata JSON, processed payload |

Send processing: `UTF-8 CRUMB → optional gzip → optional AES-256-GCM`.

Receive processing: `AES-256-GCM decrypt → gzip decompress → length check → SHA-256 check → CRUMB validation`.

Version 1 uses PBKDF2-HMAC-SHA-256 with 200,000 iterations, a 16-byte random salt, a 12-byte random IV, and AES-GCM with a 256-bit key. The passphrase is never placed in the envelope.

Metadata is informational and must not override the CRUMB body. Current keys:

```json
{
  "mediaType": "application/vnd.crumb+text",
  "filename": "handoff.crumb",
  "title": "Continue the task",
  "kind": "task",
  "crumbVersion": "1.4",
  "source": "cursor.agent",
  "createdAt": "2026-07-31T00:00:00.000Z",
  "transportProfile": "optical-fountain-qr-v1"
}
```

## 3. CB optical frame

Every QR contains one complete binary frame. All integer fields are little-endian.

| Offset | Size | Field |
|---:|---:|---|
| 0 | 1 | magic `0x43` (`C`) |
| 1 | 1 | magic `0x42` (`B`) |
| 2 | 1 | optical protocol version (`1`) |
| 3 | 1 | reserved flags |
| 4 | 4 | random session ID |
| 8 | 4 | frame sequence number |
| 12 | 2 | source block count `K` |
| 14 | 2 | source block length |
| 16 | 4 | total CBM1 envelope length |
| 20 | 4 | FNV-1a of complete CBM1 envelope |
| 24 | variable | LT fountain block |

The frame sequence and session ID deterministically select the source-block subset XORed into the frame. Receivers can join a running stream without a handshake. A new session ID resets the receiving decoder.

FNV-1a is used only as a fast post-reconstruction mismatch check. The CBM1 SHA-256 and AES-GCM authentication, when enabled, are the security-relevant integrity checks.

## 4. Fountain behavior

The encoder uses a robust-soliton degree distribution. The receiver applies a peeling decoder and ignores duplicate sequence numbers. A practical receiver should expect to collect more than `K` frames; the UI estimates progress using `K × 1.18`, but completion is determined only by all source blocks being solved.

Sender and receiver must generate bit-identical degree distributions. The implementation therefore uses a deterministic natural-log approximation made from specified IEEE-754 operations instead of JavaScript `Math.log`, whose last bits can differ across engines.

## 5. Compatibility rules

- Unknown envelope versions must be rejected.
- Unknown optical frame versions must be ignored.
- Invalid length combinations must be rejected before allocation.
- A receiver must not combine frames from different session IDs.
- A receiver must reset on incompatible parameters within one session.
- Metadata must be treated as untrusted informational text.
- A verified CRUMB remains untrusted application input.
