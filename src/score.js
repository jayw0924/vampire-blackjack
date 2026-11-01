import { toneFor } from './atmosphere.js';

let ctx = null;
let osc = null;
let gain = null;
let muted = true;
let current = 'idle';

export function setCue(cue) {
  current = cue || 'idle';
  apply();
}

export function toggleMute() {
  muted = !muted;
  if (!muted) start();
  apply();
  beatLoop();
  return muted;
}

export function isMuted() {
  return muted;
}

// Heartbeat: silent while blood is comfortable, quickening as it drains.
export function heartbeatBpm(blood) {
  if (!Number.isFinite(blood) || blood <= 0 || blood > 12) return 0;
  return Math.min(110, 72 + (12 - blood) * 3);
}

let bpm = 0;
let beatTimer = null;

export function setBlood(blood) {
  bpm = heartbeatBpm(blood);
  beatLoop();
}

function thump(at, freq, level) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, at);
  o.frequency.exponentialRampToValueAtTime(freq * 0.55, at + 0.14);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(level, at + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(at);
  o.stop(at + 0.2);
}

function beatLoop() {
  if (beatTimer) {
    clearTimeout(beatTimer);
    beatTimer = null;
  }
  if (muted || !ctx || bpm <= 0) return;
  const now = ctx.currentTime;
  thump(now, 62, 0.16);
  thump(now + 0.2, 52, 0.1);
  beatTimer = setTimeout(beatLoop, 60000 / bpm);
}

let noise = null;

// One card landing on felt: a short filtered-noise tick with a soft body.
export function snap(delayMs = 0) {
  if (muted || !ctx) return;
  const at = ctx.currentTime + delayMs / 1000;
  if (!noise) {
    const length = Math.floor(ctx.sampleRate * 0.06);
    noise = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noise.getChannelData(0);
    let seed = 7;
    for (let i = 0; i < length; i += 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[i] = (seed / 4294967296) * 2 - 1;
    }
  }
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2800;
  filter.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.22, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  src.start(at);
  thump(at, 150, 0.05);
}

function start() {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return;
  if (!ctx) {
    ctx = new AC();
    osc = ctx.createOscillator();
    osc.type = 'sine';
    gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function apply() {
  if (!ctx || !gain || !osc) return;
  const tone = toneFor(current);
  const now = ctx.currentTime;
  osc.frequency.setTargetAtTime(tone.freq, now, 0.45);
  gain.gain.setTargetAtTime(muted ? 0 : tone.gain, now, 0.35);
}
