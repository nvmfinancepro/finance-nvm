// Web Audio engine — no external files needed
let _ctx = null;
let _master = null;
let _bgOscs = [];
let _bgTimer = null;
let _enabled = false;

function ac() {
  if (typeof window === "undefined") return null;
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
    _master = _ctx.createGain();
    _master.gain.value = 1;
    _master.connect(_ctx.destination);
  }
  if (_ctx.state === "suspended") _ctx.resume();
  return _ctx;
}

/* ── Enable / disable ─────────────────────────────────────── */
export function setEnabled(v) {
  _enabled = v;
  if (v) _startBg();
  else _stopBg();
}
export function isEnabled() { return _enabled; }

/* ── Background ambient music ─────────────────────────────── */
// Pad: Am chord drone (A2-C3-E3) — triangle waves, heavily filtered
function _startBg() {
  if (_bgOscs.length) return;
  const c = ac(); if (!c) return;

  [[110, 0], [130.81, 3], [164.81, -3], [220, 5]].forEach(([freq, det]) => {
    const osc = c.createOscillator();
    const lp  = c.createBiquadFilter();
    const env = c.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    osc.detune.value = det;
    lp.type = "lowpass"; lp.frequency.value = 700; lp.Q.value = 0.5;
    env.gain.setValueAtTime(0, c.currentTime);
    env.gain.linearRampToValueAtTime(0.038, c.currentTime + 4);
    osc.connect(lp); lp.connect(env); env.connect(_master);
    osc.start();
    _bgOscs.push({ osc, env });
  });

  // Melody layer — schedules itself recursively
  _scheduleMelody(c.currentTime + 5);
}

// D Dorian melody — subtle, professional, tech feel
const MELODY = [
  [293.66, 0.55], [0, 0.25], [349.23, 0.55], [440, 0.75], [0, 0.45],
  [392,    0.55], [329.63, 0.55], [293.66, 0.9], [0, 0.5],
  [392,    0.55], [0, 0.2], [523.25, 0.55], [440, 0.8], [0, 1.5],
];

function _scheduleMelody(startTime) {
  if (!_enabled || !_master) return;
  const c = ac(); if (!c) return;
  let t = startTime;

  MELODY.forEach(([freq, dur]) => {
    if (freq > 0) {
      const osc = c.createOscillator();
      const lp  = c.createBiquadFilter();
      const env = c.createGain();
      osc.type = "sine"; osc.frequency.value = freq;
      lp.type = "lowpass"; lp.frequency.value = 3000;
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.07, t + 0.04);
      env.gain.setValueAtTime(0.07, t + dur - 0.1);
      env.gain.linearRampToValueAtTime(0, t + dur);
      osc.connect(lp); lp.connect(env); env.connect(_master);
      osc.start(t); osc.stop(t + dur + 0.05);
    }
    t += dur;
  });

  const total = MELODY.reduce((s, [, d]) => s + d, 0);
  _bgTimer = setTimeout(() => _scheduleMelody(startTime + total), (total - 1) * 1000);
}

function _stopBg() {
  if (_bgTimer) { clearTimeout(_bgTimer); _bgTimer = null; }
  const c = ac(); if (!c) return;
  _bgOscs.forEach(({ osc, env }) => {
    try {
      env.gain.linearRampToValueAtTime(0, c.currentTime + 1.2);
      osc.stop(c.currentTime + 1.3);
    } catch (_) {}
  });
  _bgOscs = [];
}

/* ── Typing click ─────────────────────────────────────────── */
export function playType() {
  if (!_enabled) return;
  const c = ac(); if (!c) return;
  const len = Math.floor(c.sampleRate * 0.028);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.25));
  const src = c.createBufferSource(); src.buffer = buf;
  const flt = c.createBiquadFilter();
  flt.type = "bandpass"; flt.frequency.value = 2800 + Math.random() * 1200; flt.Q.value = 2.5;
  const g = c.createGain(); g.gain.value = 0.28;
  src.connect(flt); flt.connect(g); g.connect(_master);
  src.start(); src.stop(c.currentTime + 0.04);
}

/* ── Notification pop ─────────────────────────────────────── */
export function playPop(freq = 720) {
  if (!_enabled) return;
  const c = ac(); if (!c) return;
  const osc = c.createOscillator();
  const g   = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq * 1.4, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freq, c.currentTime + 0.07);
  g.gain.setValueAtTime(0.22, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
  osc.connect(g); g.connect(_master);
  osc.start(); osc.stop(c.currentTime + 0.22);
}

/* ── Panel whoosh ─────────────────────────────────────────── */
export function playTransition() {
  if (!_enabled) return;
  const c = ac(); if (!c) return;
  const dur = 0.38;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = buf;
  const flt = c.createBiquadFilter();
  flt.type = "highpass";
  flt.frequency.setValueAtTime(5000, c.currentTime);
  flt.frequency.exponentialRampToValueAtTime(180, c.currentTime + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.1, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  src.connect(flt); flt.connect(g); g.connect(_master);
  src.start(); src.stop(c.currentTime + dur);
}

/* ── Checkmark tick ───────────────────────────────────────── */
export function playCheck() {
  if (!_enabled) return;
  const c = ac(); if (!c) return;
  [[880, 0], [1320, 0.065]].forEach(([freq, t]) => {
    const osc = c.createOscillator();
    const g   = c.createGain();
    osc.type = "sine"; osc.frequency.value = freq;
    const at = c.currentTime + t;
    g.gain.setValueAtTime(0.16, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.14);
    osc.connect(g); g.connect(_master);
    osc.start(at); osc.stop(at + 0.15);
  });
}

/* ── Login success chord ──────────────────────────────────── */
export function playLoginSuccess() {
  if (!_enabled) return;
  const c = ac(); if (!c) return;
  [523.25, 659.25, 783.99].forEach((freq, i) => {
    const t = c.currentTime + i * 0.09;
    const osc = c.createOscillator();
    const g   = c.createGain();
    osc.type = "sine"; osc.frequency.value = freq;
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    osc.connect(g); g.connect(_master);
    osc.start(t); osc.stop(t + 0.34);
  });
}

/* ── Outro success jingle ─────────────────────────────────── */
export function playSuccess() {
  if (!_enabled) return;
  const c = ac(); if (!c) return;
  [
    [523.25, 0],
    [659.25, 0.14],
    [783.99, 0.28],
    [1046.5, 0.44],
    [783.99, 0.60],
    [1046.5, 0.78],
  ].forEach(([freq, t]) => {
    const at  = c.currentTime + t;
    const osc = c.createOscillator();
    const g   = c.createGain();
    osc.type = "sine"; osc.frequency.value = freq;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.22, at + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.3);
    osc.connect(g); g.connect(_master);
    osc.start(at); osc.stop(at + 0.32);
  });
}
