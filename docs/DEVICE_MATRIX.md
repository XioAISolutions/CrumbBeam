# Physical Device Matrix

No optical throughput or compatibility claim should be made without a row here.

## Environment fields

| Field | Example |
|---|---|
| sender | MacBook Pro 14-inch, macOS, Chrome |
| receiver | iPhone 15 Pro, iOS, Safari |
| display | 120 Hz, 100% brightness |
| camera settings | width, height, actual FPS from `MediaStreamTrack.getSettings()` |
| lighting | indoor diffuse, no direct glare |
| distance | 30 cm |
| payload | original CRUMB bytes and CBM1 bytes |
| transport | frame FPS, frame bytes, QR version |
| timing | first decode and verified completion |
| frames | unique, duplicate, rejected, solved/K |
| result | verified, failed, cancelled |

## Results

| Date | Sender | Receiver | CRUMB / envelope | FPS / frame bytes | Distance / lighting | First frame | Verified | Frames | Result | Notes |
|---|---|---|---:|---:|---|---:|---:|---|---|---|
| pending | — | — | — | — | — | — | — | — | not tested | Complete `FIRST_BEAM.md` before release. |

## Repeated-run summary

| Device pair | Setting | Attempts | Verified | Median verified time | Exact-match rate | Status |
|---|---|---:|---:|---:|---:|---|
| laptop → iPhone Safari | baseline | 0 | 0 | — | — | required |
| laptop → Android Chrome | baseline | 0 | 0 | — | — | required |

## Claim rules

- Report device-specific numbers, not universal maximums.
- Distinguish QR frame throughput from useful verified CRUMB goodput.
- Include failed attempts in the denominator.
- State whether the devices were handheld or propped.
- State that local HTTPS may have served the application while the payload crossed optically.
- A screenshot of 100% progress is not evidence unless the final CRUMB passed SHA-256 and structural validation.
