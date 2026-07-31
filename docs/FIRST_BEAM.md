# First Physical Beam

This is the release-gating test. Run it before marking PR #1 ready or publishing a speed claim.

## Equipment

- one laptop or desktop with a bright display;
- one iPhone using Safari;
- one Android phone using Chrome;
- both devices on the same temporary local network only to load the receiver page during development;
- Wi-Fi/Bluetooth may be disabled **after both pages are loaded** to demonstrate that the payload itself crosses by light.

Development HTTPS is used only to serve the web application and unlock browser camera permission. The transfer payload does not travel through that network connection.

## Start the app

```bash
git clone https://github.com/XioAISolutions/CrumbBeam.git
cd CrumbBeam
git switch feature/optical-transport-v0.1
npm ci
npm run dev
```

Open the secure local URL on the sender. Open the secure network URL with `?mode=receive` on the phone. Accept the development certificate warning on both devices.

## Baseline settings

Use these first:

```text
sender brightness: 100%
frame rate: 12 FPS
QR payload: 700 bytes
receiver distance: 25–35 cm
phone orientation: portrait
room lighting: normal indoor, no direct glare
payload: examples/demo.crumb
passphrase: blank
```

Do not begin at the fastest settings. Establish one repeatable transfer, then increase frame rate or QR density one variable at a time.

## Run procedure

1. Load the demo CRUMB and confirm the sender reports `VALID`.
2. Press **Beam this CRUMB**.
3. On the phone, press **Start camera**.
4. Keep the entire QR code inside the scan frame and hold both devices still.
5. Record time to first accepted frame.
6. Record time to **Transfer complete and verified**.
7. Copy the result and compare it byte-for-byte with `examples/demo.crumb`.
8. Repeat three times without changing settings.
9. Repeat with a passphrase.
10. On the encrypted run, intentionally enter one wrong passphrase and verify that retry succeeds without rescanning.

## Common failure isolation

### No frames decode

- reduce to 12 FPS and 700 bytes;
- raise display brightness;
- move the phone farther away until the QR quiet zone is visible;
- clean the camera lens;
- remove screen glare;
- confirm camera permission and HTTPS;
- inspect the browser console for worker/WASM loading errors.

### Some frames decode but transfer stalls

- prop the phone to stop autofocus hunting;
- reduce FPS;
- reduce QR payload size;
- test a smaller CRUMB;
- confirm the session ID is not restarting unexpectedly;
- record unique, duplicate, rejected, and solved counters.

### Envelope reconstructs but verification fails

- for encryption, retry the passphrase without rescanning;
- record the exact error category;
- do not publish or bypass the failed result;
- start a fresh sender session and compare whether the failure repeats.

## Pass criteria

A device pair passes only when:

- three consecutive unencrypted transfers complete;
- one encrypted transfer completes;
- a wrong passphrase is rejected;
- the correct retry works without rescanning;
- copied text matches the source exactly;
- the UI reports SHA-256 verification;
- camera capture stops after completion and cancellation.

Add every run to [DEVICE_MATRIX.md](DEVICE_MATRIX.md), including failures.
