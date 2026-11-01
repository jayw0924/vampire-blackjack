import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  PORTRAIT_STATES, REDUCED_MAX_MS, TARGETS, candleLevel, dealerAssets, effectsFor, flameHold, flameTarget,
  portraitStateFor, renderModeFor, tweensFor,
} from '../src/portrait/state.js';
import { createPortrait } from '../src/portrait/portrait.js';
import { BOSSES, BOSS_ORDER } from '../src/bosses.js';
import { createRun, runView } from '../src/run.js';
import { present } from '../src/render.js';
import { act } from '../src/run.js';

test('the dealer is idle while you bet, leans in on your turn and the Bite, and sits back on a bust', () => {
  assert.equal(portraitStateFor({ phase: 'betting', stamp: '' }), 'idle');
  assert.equal(portraitStateFor({ phase: 'player', stamp: '' }), 'lean');
  assert.equal(portraitStateFor({ phase: 'bite', stamp: '' }), 'lean');
  assert.equal(portraitStateFor({ phase: 'settled', stamp: 'Bust' }), 'bust');
  assert.equal(portraitStateFor({ phase: 'settled', stamp: '' }), 'idle');
  assert.equal(portraitStateFor({ phase: 'settled', stamp: 'Blackjack' }), 'idle');
  assert.equal(portraitStateFor({ phase: 'over', stamp: 'Bust' }), 'idle');
  assert.equal(portraitStateFor(null), 'idle');
  assert.equal(portraitStateFor({}), 'idle');
  for (const view of [{ phase: 'betting' }, { phase: 'player' }, { phase: 'settled', stamp: 'Bust' }]) {
    assert.ok(PORTRAIT_STATES.includes(portraitStateFor(view)));
  }
});

test('the mapping follows a real hand through the run layer', () => {
  let run = createRun({ seed: 5, relics: [] });
  assert.equal(portraitStateFor(present(runView(run))), 'idle');
  run = act(run, 'deal');
  const view = present(runView(run));
  if (view.phase === 'player') assert.equal(portraitStateFor(view), 'lean');
  let guard = 0;
  while (run.game.phase === 'player' && guard++ < 12) run = act(run, 'hit');
  const end = present(runView(run));
  if (end.stamp === 'Bust') assert.equal(portraitStateFor(end), 'bust');
  else assert.notEqual(portraitStateFor(end), 'lean');
});

test('every state has a target for every tweened parameter', () => {
  const keys = ['lean', 'tilt', 'exp', 'face', 'ps', 'cand'];
  for (const state of PORTRAIT_STATES) {
    assert.deepEqual(Object.keys(TARGETS[state]).sort(), keys.slice().sort(), state);
  }
  // the lean values were softened in v3: the face reads as warm candlelight, not orange
  assert.ok(TARGETS.lean.cand[0] <= 1.45 && TARGETS.lean.exp[0] <= 1.07 && TARGETS.lean.face[0] <= 0.05);
  assert.ok(TARGETS.bust.ps[0] < 1 && TARGETS.bust.cand[0] < 1);
});

test('reduced motion keeps only short light fades', () => {
  for (const state of PORTRAIT_STATES) {
    const calm = tweensFor(state, { reducedMotion: true });
    assert.ok(calm.every((t) => t.dur <= REDUCED_MAX_MS), state);
    assert.equal(calm.some((t) => t.key === 'burst'), false);
  }
  assert.equal(tweensFor('bust').some((t) => t.key === 'burst'), true);
  assert.ok(tweensFor('idle').some((t) => t.dur > REDUCED_MAX_MS));
});

test('render mode: WebGL when present, the still painting when not; reduced motion drops every movement', () => {
  assert.deepEqual(renderModeFor({ webgl: true, reducedMotion: false }), { renderer: 'webgl', motion: true });
  assert.deepEqual(renderModeFor({ webgl: false, reducedMotion: false }), { renderer: 'image', motion: true });
  assert.deepEqual(renderModeFor({ webgl: true, reducedMotion: true }), { renderer: 'webgl', motion: false });
  assert.deepEqual(renderModeFor({}), { renderer: 'image', motion: true });

  const live = effectsFor(renderModeFor({ webgl: true, reducedMotion: false }));
  assert.ok(live.parallax && live.breathing && live.blink && live.tilt && live.leanMove && live.candleFlicker && live.continuous);

  const calm = effectsFor(renderModeFor({ webgl: true, reducedMotion: true }));
  for (const key of ['parallax', 'breathing', 'blink', 'tilt', 'leanMove', 'candleFlicker', 'continuous']) {
    assert.equal(calm[key], false, `${key} must stop under reduced motion`);
  }
  assert.equal(calm.lightFades, true);

  const still = effectsFor(renderModeFor({ webgl: false, reducedMotion: false }));
  assert.equal(still.parallax || still.breathing || still.blink || still.tilt || still.lightFades, false);
  assert.equal(still.continuous, false);
  assert.equal(still.candleFlicker, true);

  const stillest = effectsFor(renderModeFor({ webgl: false, reducedMotion: true }));
  assert.deepEqual(Object.values(stillest).filter(Boolean), []);
});

test('the flame model gutters on a burst and stays inside its range', () => {
  assert.ok(flameTarget(0, 0) >= 0.8 && flameTarget(0, 1) <= 1.06);
  assert.ok(flameTarget(1, 0) < flameTarget(0, 0));
  assert.ok(flameHold(1, 0.5) < flameHold(0, 0.5));
  assert.equal(candleLevel(0), 0.35);
  assert.equal(candleLevel(9), 1.5);
  assert.equal(candleLevel(1), 1);
});

test('every dealer has its textures, small enough to load per floor', () => {
  assert.deepEqual(dealerAssets('lamia'), {
    portrait: 'assets/dealers/lamia/portrait.webp',
    depth: 'assets/dealers/lamia/depth.webp',
    eyes: 'assets/dealers/lamia/eyes.webp',
  });
  for (const id of BOSS_ORDER) {
    let total = 0;
    for (const file of Object.values(dealerAssets(id))) {
      assert.ok(fs.existsSync(file), file);
      total += fs.statSync(file).size;
    }
    assert.ok(total < 160 * 1024, `${id} textures weigh ${total} bytes`);
  }
});

test('the portrait data for each boss is complete and inside the painting', () => {
  for (const id of BOSS_ORDER) {
    const fx = BOSSES[id].portraitFx;
    assert.ok(fx, id);
    assert.equal(typeof fx.blink, 'boolean');
    assert.ok(['Keeper of the house', 'She hides nothing', 'The host'].includes(fx.epithet), id);
    const uv = [...fx.head.c, ...fx.head.r, ...fx.pivot, ...fx.tiltWeight, ...fx.breath, ...fx.uplightFade, ...fx.eyes.near, ...fx.eyes.far];
    for (const v of uv) assert.ok(v > 0 && v < 1, `${id} ${v}`);
    const [x, y, w, h] = fx.eyes.rect;
    assert.ok(x > 0 && y > 0 && x + w <= 1024 && y + h <= 1536, `${id} blink rect`);
    assert.ok(fx.tiltWeight[0] < fx.tiltWeight[1] && fx.breath[0] < fx.breath[1] && fx.uplightFade[0] < fx.uplightFade[1]);
  }
});

// ---- the driver, against a stand-in page ----
function standIn({ webgl }) {
  const frames = [];
  const saved = {
    addEventListener: globalThis.addEventListener,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    devicePixelRatio: globalThis.devicePixelRatio,
  };
  globalThis.addEventListener = () => {};
  globalThis.requestAnimationFrame = (cb) => {
    frames.push(cb);
    return frames.length;
  };
  const style = () => ({ props: {}, setProperty(k, v) { this.props[k] = v; }, transform: '', opacity: '' });
  const els = {
    frame: { dataset: {}, classList: { add() {}, remove() {} }, getBoundingClientRect: () => ({ width: 100, height: 150 }) },
    lean: { style: style() },
    canvas: { getContext: () => (webgl ? null : null), addEventListener() {}, width: 0, height: 0 },
    shade: { style: style() },
    felt: { style: style() },
    glow: { style: style() },
  };
  const restore = () => Object.assign(globalThis, saved);
  return { els, frames, restore };
}

test('without WebGL the driver settles on the still painting', async () => {
  const page = standIn({ webgl: false });
  try {
    const portrait = createPortrait(page.els, { rng: () => 0.5 });
    await portrait.setDealer('steward', BOSSES.steward.portraitFx);
    assert.equal(portrait.ready, false);
    assert.equal(portrait.mode.renderer, 'image');
    assert.equal(page.els.frame.dataset.renderer, 'image');
    assert.equal(page.els.frame.dataset.gl, undefined, 'the painting stays visible');
    portrait.setState('lean');
    assert.equal(portrait.state, 'lean');
    assert.equal(page.els.frame.dataset.state, 'lean');
  } finally {
    page.restore();
  }
});

test('reduced motion: no flicker, no lean movement, and the loop goes quiet', async () => {
  const page = standIn({ webgl: false });
  try {
    let n = 0;
    const rng = () => ((n += 0.37) % 1);
    const portrait = createPortrait(page.els, { reducedMotion: true, rng });
    assert.equal(page.els.frame.dataset.motion, 'off');
    const flames = [0, 1, 2].map(() => ({ style: { props: {}, setProperty(k, v) { this.props[k] = v; } } }));
    portrait.setCandles(flames);
    await portrait.setDealer('lamia', BOSSES.lamia.portraitFx);
    portrait.setState('lean');
    // run every frame the loop asks for
    let now = 1000;
    let guard = 0;
    while (page.frames.length && guard++ < 200) {
      now += 33;
      page.frames.shift()(now);
    }
    assert.ok(guard < 200, 'the loop stops by itself');
    for (const flame of flames) assert.equal(flame.style.props['--f'], '1.000');
    assert.equal(page.els.lean.style.transform, '', 'no scale or translate toward the table');
  } finally {
    page.restore();
  }
});

test('with motion allowed the flames flicker and the dealer leans in', async () => {
  const page = standIn({ webgl: false });
  try {
    let n = 0;
    const rng = () => ((n += 0.37) % 1);
    const portrait = createPortrait(page.els, { reducedMotion: false, rng });
    assert.equal(page.els.frame.dataset.motion, 'on');
    const flames = [0, 1, 2].map(() => ({ style: { props: {}, setProperty(k, v) { this.props[k] = v; } } }));
    portrait.setCandles(flames);
    portrait.setState('lean');
    let now = 1000;
    for (let i = 0; i < 60 && page.frames.length; i += 1) {
      now += 33;
      page.frames.shift()(now);
    }
    assert.ok(flames.some((f) => f.style.props['--f'] !== '1.000'), 'a flame moved');
    assert.match(page.els.lean.style.transform, /scale\(1\.0[1-6]/);
    // the OS setting can change while the page is open
    portrait.setReducedMotion(true);
    assert.equal(page.els.frame.dataset.motion, 'off');
    for (let i = 0; i < 100 && page.frames.length; i += 1) {
      now += 33;
      page.frames.shift()(now);
    }
    assert.equal(page.els.lean.style.transform, '');
    assert.equal(flames[0].style.props['--f'], '1.000');
  } finally {
    page.restore();
  }
});

test('the page seats the portrait layer and keeps the dealer assets lazy', () => {
  const ui = fs.readFileSync('src/ui.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(ui, /portraitStateFor\(view\)/);
  assert.match(ui, /portraitLayer\.setDealer\(view\.bossId, boss\.portraitFx\)/);
  assert.match(ui, /prefers-reduced-motion: reduce/);
  assert.match(html, /src\/dealers\.css/);
  assert.match(html, /<canvas id="gl"/);
  // only the current dealer's textures are requested, on demand, never in the page markup
  assert.equal(html.includes('assets/dealers'), false);
  assert.match(fs.readFileSync('src/portrait/portrait.js', 'utf8'), /texCache\[id\]/);
  // no lamp over the dealer, and the old framed arch is gone
  const css = fs.readFileSync('src/dealers.css', 'utf8');
  assert.equal(/\blamp\b|\bbeam\b|conic-gradient/i.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), false);
  assert.match(css, /#lord-frame \{[^}]*border: 0/);
});

test('reduced motion has a CSS fallback too: no candle flame animation, no lean transition', () => {
  const css = fs.readFileSync('src/dealers.css', 'utf8');
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /#lean \{[^}]*transition: none/);
});
