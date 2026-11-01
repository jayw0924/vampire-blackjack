// The living portrait as a pure function of the game. No DOM, no WebGL, no clock: everything the
// browser layer needs to decide is decided here so it can be tested.

export const PORTRAIT_STATES = ['idle', 'lean', 'bust'];

// Game phase (as presented by render.js) -> what the dealer is doing.
//   betting, the next-hand wait after a hand that is not a bust, a finished evening -> idle
//   your turn, or the Bite choice                                                    -> lean
//   the hand just settled with the BUST stamp                                        -> bust
export function portraitStateFor(view) {
  if (!view) return 'idle';
  if (view.phase === 'player' || view.phase === 'bite') return 'lean';
  if (view.phase === 'settled' && view.stamp === 'Bust') return 'bust';
  return 'idle';
}

// Where each tweened parameter goes in each state, and how long it takes (ms).
export const TARGETS = {
  idle: {
    lean: [0, 900], tilt: [0, 1000], exp: [1, 900], face: [0, 900], ps: [1, 900], cand: [1, 900],
  },
  // toward the table and the candlelight: forward and down, the uplight finds his face
  lean: {
    lean: [1, 700], tilt: [0, 500], exp: [1.07, 700], face: [0.05, 700], ps: [1.04, 700], cand: [1.45, 700],
  },
  // he sits back, the head tilts, the room tightens, the candles gutter
  bust: {
    lean: [-0.5, 520], tilt: [1, 420], exp: [0.9, 420], face: [-0.05, 420], ps: [0.78, 320], cand: [0.55, 420],
  },
};

export const REST = { lean: 0, tilt: 0, exp: 1, face: 0, ps: 1, cand: 1, burst: 0 };

export const REDUCED_MAX_MS = 400;

// The tweens to start when the dealer enters a state. Under reduced motion every fade is short.
export function tweensFor(state, { reducedMotion = false } = {}) {
  const table = TARGETS[state] || TARGETS.idle;
  const list = Object.entries(table).map(([key, [to, dur]]) => ({
    key, to, dur: reducedMotion ? Math.min(dur, REDUCED_MAX_MS) : dur,
  }));
  if (state === 'bust' && !reducedMotion) list.push({ key: 'burst', from: 1, to: 0, dur: 900 });
  return list;
}

// How the portrait is drawn, from what the browser can do.
//   renderer: 'webgl' (the shader) or 'image' (the still painting, no GL needed)
//   motion:   false under prefers-reduced-motion
export function renderModeFor({ webgl = false, reducedMotion = false } = {}) {
  return { renderer: webgl ? 'webgl' : 'image', motion: !reducedMotion };
}

// What moves in a given mode. Light fades (brightness, candle level, vignette) are not motion and stay,
// but only the shader can relight a face.
export function effectsFor(mode) {
  const gl = mode.renderer === 'webgl';
  return {
    parallax: gl && mode.motion,
    breathing: gl && mode.motion,
    blink: gl && mode.motion,
    tilt: gl && mode.motion,
    leanMove: mode.motion,           // the scale/translate toward the table
    candleFlicker: mode.motion,
    lightFades: gl,
    // the render loop runs forever only when something is always moving
    continuous: gl ? mode.motion : false,
  };
}

// Where a dealer's textures live.
export function dealerAssets(bossId, base = 'assets/dealers') {
  return {
    portrait: `${base}/${bossId}/portrait.webp`,
    depth: `${base}/${bossId}/depth.webp`,
    eyes: `${base}/${bossId}/eyes.webp`,
  };
}

// One flame's flicker target, given the burst (1 while the room is gutting, 0 at rest) and a 0..1 sample.
export function flameTarget(burst, sample) {
  const lo = 0.82 - burst * 0.25;
  return lo + sample * (1.06 - lo);
}

export function flameHold(burst, sample) {
  return (80 + sample * 220) * (1 - 0.5 * burst);
}

// How far the candles are allowed to show: they gutter while the room is tight.
export function candleLevel(cand) {
  return Math.min(1.5, Math.max(0.35, cand));
}
