# CrumbBeam Launch Plan

## One claim

> We transferred an AI's working context between two offline devices using only light.

Do not lead with fountain coding, QR versions, PBKDF2, or the CRUMB specification. Lead with the visible event. Explain the engineering after the viewer understands what happened.

## Required proof before launch

- [ ] fresh clone installs successfully;
- [ ] CI is green;
- [ ] one iPhone and one Android device complete the demo;
- [ ] received CRUMB exactly matches sender text;
- [ ] encrypted demo rejects a wrong passphrase;
- [ ] README quick start is tested by someone who did not build the project;
- [ ] original Decimen project is visibly credited;
- [ ] claims state the device setup and do not universalize throughput;
- [ ] no client or private CRUMB appears in the video;
- [ ] repository topics and description are set on GitHub.

Suggested GitHub description:

```text
Beam verified AI context between offline devices using animated fountain-coded QR frames.
```

Suggested topics:

```text
ai-context ai-agents offline-first qr-code fountain-codes air-gap webcrypto wasm local-first handoff
```

## The 25-second video

### 0–3 seconds

Show two devices with Wi-Fi and Bluetooth disabled.

```text
Can an AI handoff cross devices with no network?
```

### 3–7 seconds

Show the first AI generate a compact task CRUMB.

```text
Goal + context + constraints + next action
```

### 7–14 seconds

Click **Beam this CRUMB**. Fill the frame with the animated QR stream. Show the phone camera beginning to receive.

```text
The payload is travelling as light.
```

### 14–20 seconds

Show progress and then the verified handoff with its title and constraints.

```text
Dropped frames tolerated · SHA-256 verified
```

### 20–25 seconds

Paste the received CRUMB into the second AI and show it correctly state the next action.

```text
CRUMB defines the message. CrumbBeam delivers it.
```

## Launch copy

### GitHub or Hacker News title

```text
Show HN: CrumbBeam – transfer AI context between offline devices using only light
```

### Short post

```text
I built CrumbBeam: an optical transport for CRUMB AI handoffs.

A laptop turns the goal, context, constraints, and next actions into an endless stream of fountain-coded QR frames. A phone reconstructs the handoff with its camera, verifies SHA-256, and can continue the task in another AI.

No account. No pairing. No direct network path. Optional AES-GCM encryption.

CRUMB defines the message. CrumbBeam delivers it.
```

### Technical post opening

```text
Sequential animated QR transfer fails in an annoying way: miss one frame and you wait for the whole loop. CrumbBeam uses LT fountain coding instead. Every frame is a different equation over source blocks, so the receiver can recover from any sufficient set of frames in any order.

The interesting part is not moving arbitrary bytes. It is moving a verified AI handoff that the next model can immediately understand and continue.
```

## Release sequence

### Day -3: evidence

- publish the protocol and threat model;
- complete the device matrix;
- capture raw screen and camera footage;
- file every known failure as an issue.

### Day -2: comprehension

Give the repository to three people. They should each answer:

1. What does it do?
2. Why is fountain coding needed?
3. What does verification prove and not prove?
4. Can they complete a demo without messaging the author?

Fix the README wherever answers diverge.

### Day -1: assets

- 25-second vertical demo;
- 60–90 second narrated demo;
- one architecture image;
- one transfer-complete screenshot;
- one exact command block;
- release notes with known limitations.

### Launch day

Post the GitHub repository first so every social post has one canonical destination. Then publish the short video, technical explanation, and ecosystem thread. Be present for technical questions and acknowledge related projects immediately.

### Days +1 to +7

- turn recurring questions into README sections;
- label good first issues;
- publish device-specific measurements;
- merge small reliability improvements quickly;
- resist unrelated agent-platform features until the optical proof is dependable.

## Metrics that matter

Virality is not the product metric. Track:

- repository visitors to successful local starts;
- starts to first verified beam;
- median time to first beam;
- completion rate by device pair;
- repeat beams per user;
- outside contributors reproducing results;
- stars that convert into issues, forks, demos, or integrations.
