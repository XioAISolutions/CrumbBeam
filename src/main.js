import QRCode from "qrcode";
import "./styles.css";
import { inspectCrumb } from "./lib/crumb.mjs";
import { packCrumbEnvelope, unpackCrumbEnvelope } from "./lib/envelope.mjs";
import { BeamReceiver, BeamSender } from "./lib/transport.mjs";

const $ = (id) => document.getElementById(id);
const text = $("crumb-text");
const file = $("crumb-file");
const inspection = $("crumb-inspection");
const startSend = $("start-send");
const stopSend = $("stop-send");
const beamStage = $("beam-stage");
const sendStats = $("send-stats");
const qrCanvas = $("qr-canvas");
let sourceFilename = "handoff.crumb";
let sendGeneration = 0;
let activeCrumb = null;

for (const button of document.querySelectorAll(".mode-button")) button.addEventListener("click", () => selectMode(button.dataset.mode));

function selectMode(mode) {
  document.querySelectorAll(".mode-button").forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
  $("send-panel").classList.toggle("active", mode === "send");
  $("receive-panel").classList.toggle("active", mode === "receive");
  const url = new URL(location.href);
  url.searchParams.set("mode", mode);
  history.replaceState(null, "", url);
}

if (new URL(location.href).searchParams.get("mode") === "receive") selectMode("receive");

file.addEventListener("change", async () => {
  const selected = file.files?.[0];
  if (!selected) return;
  sourceFilename = selected.name;
  text.value = await selected.text();
  validateInput();
});
text.addEventListener("input", validateInput);

$("load-demo").addEventListener("click", async () => {
  sourceFilename = "light-handoff.crumb";
  text.value = await fetch("/examples/demo.crumb").then((response) => response.text());
  validateInput();
});

function validateInput() {
  const value = text.value.trim();
  if (!value) {
    activeCrumb = null;
    inspection.className = "inspection idle";
    inspection.textContent = "Waiting for a CRUMB.";
    startSend.disabled = true;
    return;
  }
  const result = inspectCrumb(value + (value.endsWith("\n") ? "" : "\n"));
  activeCrumb = result.ok ? result : null;
  inspection.className = `inspection ${result.ok ? "good" : "bad"}`;
  inspection.textContent = result.ok
    ? `VALID · ${result.kind} · v${result.version} · ${result.bytes.toLocaleString()} bytes · ${result.title}`
    : `INVALID · ${result.error}`;
  startSend.disabled = !result.ok;
}

startSend.addEventListener("click", async () => {
  if (!activeCrumb) return;
  const generation = ++sendGeneration;
  startSend.disabled = true;
  stopSend.hidden = false;
  beamStage.hidden = false;
  sendStats.textContent = "Packing and verifying envelope…";
  try {
    const normalized = text.value.trimEnd() + "\n";
    const envelope = await packCrumbEnvelope(normalized, { filename: sourceFilename, passphrase: $("send-passphrase").value || undefined });
    if (generation !== sendGeneration) return;
    const fps = Number($("send-fps").value);
    const frameBytes = Number($("send-frame-bytes").value);
    const sender = new BeamSender(envelope, { frameBytes });
    await runQrStream(sender, fps, generation);
  } catch (error) {
    sendStats.textContent = `ERROR · ${error instanceof Error ? error.message : String(error)}`;
    startSend.disabled = false;
    stopSend.hidden = true;
  }
});

stopSend.addEventListener("click", () => {
  sendGeneration++;
  startSend.disabled = !activeCrumb;
  stopSend.hidden = true;
  sendStats.textContent = "Beam stopped.";
});

async function runQrStream(sender, fps, generation) {
  let version;
  const staging = document.createElement("canvas");
  const queue = [];
  const margin = 4;
  const makeFrame = () => {
    const bytes = sender.nextFrame();
    const qr = QRCode.create([{ data: bytes, mode: "byte" }], { errorCorrectionLevel: "L", version, maskPattern: 4 });
    if (!version) {
      version = qr.version;
      const size = qr.modules.size + margin * 2;
      staging.width = size;
      staging.height = size;
      qrCanvas.width = size * 6;
      qrCanvas.height = size * 6;
    }
    const size = qr.modules.size;
    const total = size + margin * 2;
    const image = new ImageData(total, total);
    const pixels = new Uint32Array(image.data.buffer);
    pixels.fill(0xffffffff);
    for (let y = 0; y < size; y++) {
      const row = (y + margin) * total + margin;
      for (let x = 0; x < size; x++) if (qr.modules.data[y * size + x]) pixels[row + x] = 0xff000000;
    }
    return image;
  };
  const refill = () => {
    if (generation !== sendGeneration) return;
    try {
      while (queue.length < 3) queue.push(makeFrame());
      setTimeout(refill, 0);
    } catch (error) {
      sendStats.textContent = `QR ERROR · ${error instanceof Error ? error.message : String(error)}`;
      sendGeneration++;
    }
  };
  refill();
  const interval = 1000 / fps;
  let nextAt = performance.now();
  const tick = (now) => {
    if (generation !== sendGeneration) return;
    requestAnimationFrame(tick);
    if (now < nextAt || !queue.length) return;
    const image = queue.shift();
    staging.getContext("2d").putImageData(image, 0, 0);
    const context = qrCanvas.getContext("2d");
    context.imageSmoothingEnabled = false;
    context.drawImage(staging, 0, 0, qrCanvas.width, qrCanvas.height);
    const stats = sender.stats;
    sendStats.textContent = [`SESSION ${stats.sessionId.toString(16).padStart(8, "0")} · FRAME ${stats.sequence}`, `${fps} FPS · QR V${version} · ${stats.blockLength} B/block · K=${stats.blockCount}`, `${(stats.totalLength / 1024).toFixed(1)} KB encrypted envelope`].join("\n");
    nextAt += interval;
    if (now - nextAt > interval * 3) nextAt = now + interval;
  };
  requestAnimationFrame(tick);
  try { await navigator.wakeLock?.request("screen"); } catch {}
}

const startReceive = $("start-receive");
const stopReceive = $("stop-receive");
const cameraStage = $("camera-stage");
const video = $("camera-video");
const receiveStatus = $("receive-status");
const progress = $("receive-progress");
const metrics = $("receive-metrics");
const receiver = new BeamReceiver();
let captureGeneration = 0;
let mediaStream = null;
let workers = [];
let busy = [];
let receivedText = null;
let receivedFilename = "received.crumb";

startReceive.addEventListener("click", () => startCamera());
stopReceive.addEventListener("click", stopCamera);

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    receiveStatus.textContent = "Camera requires HTTPS. Open the secure Vite network URL.";
    cameraStage.hidden = false;
    return;
  }
  stopCamera();
  receiver.reset();
  progress.style.width = "0%";
  $("receive-result").hidden = true;
  cameraStage.hidden = false;
  startReceive.hidden = true;
  stopReceive.hidden = false;
  receiveStatus.textContent = "Requesting camera…";
  try {
    const base = { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } };
    try { mediaStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { ...base, frameRate: { exact: 60 } } }); }
    catch { mediaStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { ...base, frameRate: { ideal: 30 } } }); }
    video.srcObject = mediaStream;
    await video.play();
  } catch (error) {
    receiveStatus.textContent = `CAMERA ERROR · ${error instanceof Error ? error.message : String(error)}`;
    stopCamera();
    return;
  }
  workers = Array.from({ length: Math.min(3, Math.max(1, navigator.hardwareConcurrency ? Math.floor(navigator.hardwareConcurrency / 3) : 2)) }, (_, slot) => {
    const worker = new Worker(new URL("./workers/qr-worker.js", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }) => { busy[slot] = false; if (data.bytes) onQrDecoded(new Uint8Array(data.bytes)); };
    return worker;
  });
  busy = workers.map(() => false);
  receiveStatus.textContent = "Searching for CrumbBeam frames…";
  const generation = ++captureGeneration;
  scheduleCapture(generation);
  try { await navigator.wakeLock?.request("screen"); } catch {}
}

function stopCamera() {
  captureGeneration++;
  mediaStream?.getTracks().forEach((track) => track.stop());
  mediaStream = null;
  workers.forEach((worker) => worker.terminate());
  workers = [];
  busy = [];
  video.srcObject = null;
  startReceive.hidden = false;
  stopReceive.hidden = true;
}

const grabCanvas = document.createElement("canvas");
let captureId = 0;
function scheduleCapture(generation) {
  if (generation !== captureGeneration || !mediaStream) return;
  const callback = () => {
    if (generation !== captureGeneration || !mediaStream) return;
    captureFrame();
    scheduleCapture(generation);
  };
  if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(callback);
  else requestAnimationFrame(callback);
}

function captureFrame() {
  const width = video.videoWidth;
  const height = video.videoHeight;
  const slot = busy.indexOf(false);
  if (!width || !height || slot < 0) return;
  if (grabCanvas.width !== width || grabCanvas.height !== height) { grabCanvas.width = width; grabCanvas.height = height; }
  const context = grabCanvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(video, 0, 0, width, height);
  const image = context.getImageData(0, 0, width, height);
  busy[slot] = true;
  workers[slot].postMessage({ id: captureId++, buffer: image.data.buffer, width, height }, [image.data.buffer]);
}

async function onQrDecoded(bytes) {
  const state = receiver.add(bytes);
  if (!state.accepted) return;
  const pct = state.complete ? 100 : Math.max(1, Math.round(state.progress * 100));
  progress.style.width = `${pct}%`;
  receiveStatus.textContent = state.complete ? "Envelope reconstructed. Verifying…" : `Receiving session · ${pct}% estimated`;
  metrics.textContent = `unique ${state.framesNew} · duplicates ${state.framesDuplicate} · solved ${state.solvedCount}/${state.blockCount}`;
  if (!state.complete) return;
  stopCamera();
  try {
    const result = await unpackCrumbEnvelope(state.payload, { passphrase: $("receive-passphrase").value || undefined });
    receivedText = result.text;
    receivedFilename = result.metadata.filename || "received.crumb";
    $("result-title").textContent = result.crumb.title;
    $("result-meta").textContent = `${result.crumb.kind} · CRUMB v${result.crumb.version} · ${result.metadata.source} · SHA-256 verified`;
    $("result-text").textContent = result.text;
    $("receive-result").hidden = false;
    receiveStatus.textContent = "Transfer complete and verified.";
  } catch (error) {
    receiveStatus.textContent = `VERIFY ERROR · ${error instanceof Error ? error.message : String(error)}`;
    startReceive.hidden = false;
  }
}

$("copy-result").addEventListener("click", async () => {
  if (!receivedText) return;
  await navigator.clipboard.writeText(receivedText);
  $("copy-result").textContent = "Copied";
  setTimeout(() => { $("copy-result").textContent = "Copy CRUMB"; }, 1200);
});

$("download-result").addEventListener("click", () => {
  if (!receivedText) return;
  const url = URL.createObjectURL(new Blob([receivedText], { type: "text/plain" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = receivedFilename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
