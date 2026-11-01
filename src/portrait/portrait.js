// The living portrait driver: WebGL depth parallax, breathing, blinks, candle light.
// It never reads game state. Call setState('idle'|'lean'|'bust'), setDealer(id, fx),
// setCandles(elements) and setReducedMotion(bool); everything else is the layer's own.
import { FRAGMENT, UNIFORMS, VERTEX } from './glsl.js';
import {
  REST, candleLevel, dealerAssets, effectsFor, flameHold, flameTarget, renderModeFor, tweensFor,
} from './state.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const EASE = {
  out: (t) => 1 - (1 - t) ** 3,
  io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
  return shader;
}

export function webglAvailable(doc = globalThis.document) {
  try {
    const probe = doc.createElement('canvas');
    return Boolean(probe.getContext('webgl2') || probe.getContext('webgl'));
  } catch {
    return false;
  }
}

export function createPortrait(els, options = {}) {
  const { assetBase = 'assets/dealers', onMode = () => {}, rng = Math.random } = options;
  const { frame, lean, canvas, shade, felt, glow } = els;
  const win = globalThis;
  const P = { ...REST };
  const S = { par: [0, 0], parT: [0, 0], breath: 0, blink: 0, cflick: 1, t: 0 };
  const texCache = {};
  const candles = [];

  let gl = null;
  let U = {};
  let glReady = false;
  let dealer = null;      // { id, fx }
  let state = 'idle';
  let tweens = [];
  let running = false;
  let reduced = Boolean(options.reducedMotion);
  let mode = renderModeFor({ webgl: false, reducedMotion: reduced });
  let fx = effectsFor(mode);
  let blinkAt = -1;
  let blinkTimer = 0;
  let pointerAt = -1e9;
  let last = 0;
  let lastCandle = 0;
  let lastPs = -1;
  let lastKey = -1;
  let swapId = 0;

  const publish = () => {
    mode = renderModeFor({ webgl: glReady, reducedMotion: reduced });
    fx = effectsFor(mode);
    frame.dataset.renderer = mode.renderer;
    frame.dataset.motion = mode.motion ? 'on' : 'off';
    onMode({ ...mode, effects: fx });
  };

  function tween(key, to, dur, from) {
    tweens = tweens.filter((w) => w.key !== key);
    tweens.push({ key, from: from ?? P[key], to, t0: performance.now(), dur });
    kick();
  }

  function stepTweens(now) {
    for (const w of tweens) {
      const k = Math.min(1, (now - w.t0) / w.dur);
      P[w.key] = w.from + (w.to - w.from) * EASE.out(k);
      if (k >= 1) w.done = true;
    }
    tweens = tweens.filter((w) => !w.done);
  }

  function setState(next) {
    if (!['idle', 'lean', 'bust'].includes(next)) return;
    const changed = next !== state;
    state = next;
    frame.dataset.state = next;
    for (const t of tweensFor(next, { reducedMotion: reduced })) tween(t.key, t.to, t.dur, t.from);
    if (next === 'bust' && !reduced && changed) P.burst = 1;
    kick();
  }

  // ---- blink: 65 ms closing, 30 hold, 80 opening ----
  function blink() {
    if (!fx.blink || blinkAt >= 0 || !dealer?.fx.blink) return;
    blinkAt = performance.now();
    kick();
  }
  function stepBlink(now) {
    if (blinkAt < 0) {
      S.blink = 0;
      return;
    }
    const t = now - blinkAt;
    S.blink = t < 65 ? EASE.out(t / 65) : t < 95 ? 1 : t < 175 ? 1 - EASE.io((t - 95) / 80) : 0;
    if (t >= 175) {
      blinkAt = -1;
      S.blink = 0;
    }
  }
  function scheduleBlink() {
    clearTimeout(blinkTimer);
    blinkTimer = setTimeout(() => {
      blink();
      scheduleBlink();
    }, 4000 + rng() * 5000);
    blinkTimer?.unref?.();   // node (tests) must be free to exit; browsers return a number
  }

  // ---- candle flicker: each lit flame has its own breath; the face and the felt follow their mean ----
  function setCandles(list) {
    candles.length = 0;
    for (const el of list) candles.push({ el, f: 1, t: 1, next: 0 });
    lastCandle = 0;
    stepCandles(performance.now(), true);
  }
  function stepCandles(now, force = false) {
    if (!force && now - lastCandle < 33) return;
    lastCandle = now;
    if (!candles.length) {
      S.cflick = 1;
    } else {
      let sum = 0;
      const level = Math.min(1, candleLevel(P.cand));
      for (const c of candles) {
        if (!fx.candleFlicker) {
          c.f = 1;
        } else {
          if (now >= c.next) {
            c.t = flameTarget(P.burst, rng());
            c.next = now + flameHold(P.burst, rng());
          }
          c.f += (c.t - c.f) * 0.35;
        }
        c.el.style.setProperty('--f', (c.f * level).toFixed(3));
        c.el.style.setProperty('--fx', (1 - (1 - c.f) * 0.4).toFixed(3));
        sum += c.f;
      }
      S.cflick = sum / candles.length;
    }
    if (glow) glow.style.opacity = ((fx.candleFlicker ? S.cflick : 1) * clamp(P.cand, 0.35, 1.5)).toFixed(3);
  }

  // ---- WebGL ----
  async function initGL() {
    if (glReady || gl === false) return glReady;
    try {
      gl = canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'high-performance' })
        || canvas.getContext('webgl', { alpha: false, antialias: false });
      if (!gl) throw new Error('no webgl');
      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link failed');
      gl.useProgram(prog);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      for (const name of UNIFORMS) U[name] = gl.getUniformLocation(prog, name);
      gl.uniform1i(U.uImg, 0);
      gl.uniform1i(U.uDepth, 1);
      gl.uniform1i(U.uEyes, 2);
      canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        fallBack();
      });
      return true;
    } catch (error) {
      gl = false;
      return false;
    }
  }

  function upload(unit, image, mip) {
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const gl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
    if (mip && gl2) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return tex;
  }

  async function useDealer(id, dfx) {
    if (!texCache[id]) {
      const urls = dealerAssets(id, assetBase);
      const [img, depth, eyes] = await Promise.all([loadImage(urls.portrait), loadImage(urls.depth), loadImage(urls.eyes)]);
      texCache[id] = [upload(0, img, true), upload(1, depth, false), upload(2, eyes, false)];
    }
    texCache[id].forEach((tex, i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, tex);
    });
    gl.uniform2f(U.uHeadC, dfx.head.c[0], dfx.head.c[1]);
    gl.uniform2f(U.uHeadR, dfx.head.r[0], dfx.head.r[1]);
    gl.uniform2f(U.uPivot, dfx.pivot[0], dfx.pivot[1]);
    gl.uniform2f(U.uHw, dfx.tiltWeight[0], dfx.tiltWeight[1]);
    gl.uniform2f(U.uBm, dfx.breath[0], dfx.breath[1]);
    gl.uniform2f(U.uLow, dfx.uplightFade[0], dfx.uplightFade[1]);
    gl.uniform2f(U.uE1, dfx.eyes.near[0], dfx.eyes.near[1]);
    gl.uniform2f(U.uE2, dfx.eyes.far[0], dfx.eyes.far[1]);
    gl.uniform4f(U.uRect, dfx.eyes.rect[0], dfx.eyes.rect[1], dfx.eyes.rect[2], dfx.eyes.rect[3]);
  }

  function fallBack() {
    glReady = false;
    gl = false;
    delete frame.dataset.gl;
    publish();
  }

  // Switching dealer: fade the portrait out, swap textures and numbers, fade in. Cached after the first visit.
  async function setDealer(id, dfx) {
    if (dealer && dealer.id === id) return;
    const ticket = ++swapId;
    const first = !dealer;
    dealer = { id, fx: dfx };
    frame.dataset.dealer = id;
    blinkAt = -1;
    S.blink = 0;
    if (!first && glReady) {
      frame.classList.add('swap');
      await new Promise((resolve) => setTimeout(resolve, reduced ? 60 : 270));
    }
    if (ticket !== swapId) return;
    if (!glReady && gl !== false && (options.enabled ?? true)) {
      if (await initGL()) {
        try {
          await useDealer(id, dfx);
          glReady = true;
          resize();
        } catch {
          fallBack();
        }
      }
    } else if (glReady) {
      try {
        await useDealer(id, dfx);
      } catch {
        fallBack();
      }
    }
    if (ticket !== swapId) return;
    frame.classList.remove('swap');
    if (glReady) frame.dataset.gl = 'ready';
    publish();
    kick();
  }

  function resize() {
    if (!glReady) return;
    const r = frame.getBoundingClientRect();
    const dpr = Math.min(win.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    kick();
  }

  function setReducedMotion(on) {
    reduced = Boolean(on);
    if (reduced) {
      S.par = [0, 0];
      S.parT = [0, 0];
      S.breath = 0;
      S.blink = 0;
      blinkAt = -1;
    }
    publish();
    setState(state);
    for (const c of candles) c.f = 1;
    kick();
  }

  // ---- the frame loop ----
  function frameStep(now) {
    const dt = Math.min(0.1, (now - last) / 1000 || 0.016);
    last = now;
    stepTweens(now);
    S.t += dt;
    if (fx.parallax) {
      let target = S.parT;
      if (now - pointerAt > 3000) target = [Math.sin(S.t * 0.31) * 0.28, Math.sin(S.t * 0.23 + 1) * 0.14];
      const k = 1 - Math.exp(-dt * 5);
      S.par = [S.par[0] + (target[0] - S.par[0]) * k, S.par[1] + (target[1] - S.par[1]) * k];
    }
    S.breath = fx.breathing ? Math.sin((S.t * Math.PI * 2) / 4.6) : 0;
    if (fx.blink) stepBlink(now);
    stepCandles(now);

    const move = fx.leanMove ? 1 : 0;
    const L = P.lean * move;
    const scale = L >= 0 ? 1 + 0.06 * L : 1 + 0.03 * L;
    const ty = L >= 0 ? 1.3 * L : -1.4 * L;
    lean.style.transform = move || L ? `translateY(${ty.toFixed(3)}svh) scale(${scale.toFixed(4)})` : '';
    const key = clamp(0.55 + (P.ps - 0.78) * 1.7, 0.55, 1.1);
    if (shade && Math.abs(P.ps - lastPs) > 0.0005) {
      lastPs = P.ps;
      shade.style.transform = `scale(${P.ps.toFixed(4)})`;
    }
    if (felt && Math.abs(key - lastKey) > 0.002) {
      lastKey = key;
      felt.style.setProperty('--kdim', key.toFixed(3));
    }
    if (glReady) {
      gl.uniform2f(U.uPar, fx.parallax ? S.par[0] : 0, fx.parallax ? S.par[1] : 0);
      gl.uniform1f(U.uBreath, S.breath);
      gl.uniform1f(U.uTilt, fx.tilt ? P.tilt : 0);
      gl.uniform1f(U.uBlink, S.blink);
      gl.uniform1f(U.uExp, P.exp);
      gl.uniform1f(U.uCand, P.cand);
      gl.uniform1f(U.uCFlick, fx.candleFlicker ? S.cflick : 1);
      gl.uniform1f(U.uFace, P.face);
      gl.uniform1f(U.uEyeF, fx.parallax ? 1 : 0);
      gl.uniform1f(U.uKey, key);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    const alive = fx.continuous || (fx.candleFlicker && candles.length > 0) || tweens.length > 0;
    if (alive) {
      win.requestAnimationFrame(frameStep);
    } else {
      running = false;
    }
  }
  function kick() {
    if (running) return;
    running = true;
    win.requestAnimationFrame(frameStep);
  }

  win.addEventListener('pointermove', (event) => {
    pointerAt = performance.now();
    S.parT = [clamp((event.clientX / win.innerWidth - 0.5) * 2, -1, 1), clamp((event.clientY / win.innerHeight - 0.5) * 2, -1, 1)];
  }, { passive: true });
  win.addEventListener('resize', resize);
  scheduleBlink();
  publish();

  return {
    setState, setDealer, setCandles, setReducedMotion, resize, blink,
    destroy() { clearTimeout(blinkTimer); win.removeEventListener?.('resize', resize); },
    get mode() { return { ...mode }; },
    get state() { return state; },
    get ready() { return glReady; },
    get dealer() { return dealer?.id ?? null; },
    params: P,
  };
}
