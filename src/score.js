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
  return muted;
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
