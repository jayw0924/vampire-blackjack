import { nextRng } from './cards.js';

// Six relics. A hook gets { run, ...context } and returns an optional patch:
//   { blood, note, flags }   change blood, say why, set per-floor flags
//   { arm }                  (onDeal) arm the one-time look at the hole card
//   { free }                 (onBite) the Bite costs nothing
//   { hands }                (onFloorStart) extra hands until dawn
//   { rules }                (onRules) table rules this relic changes
// Per-floor flags live in run.flags and reset when a new floor begins.
export const RELICS = {
  'charons-obol': {
    id: 'charons-obol',
    name: "Charon's Obol",
    effect: 'The first bust on each floor refunds 2 blood.',
    onBust: ({ run }) => (run.flags.obol ? null : { blood: 2, note: 'Obol +2', flags: { obol: true } }),
  },
  'silver-mirror': {
    id: 'silver-mirror',
    name: 'Silver Mirror',
    effect: 'Once per floor, look at the dealer\'s hole card. Tap it on your turn.',
    active: true,
    onDeal: ({ run }) => (run.flags.mirror ? null : { arm: true }),
  },
  'lamias-tooth': {
    id: 'lamias-tooth',
    name: "Lamia's Tooth",
    effect: 'The first Bite on each floor costs nothing.',
    onBite: ({ run }) => (run.flags.tooth ? null : { free: true, flags: { tooth: true } }),
  },
  'hecates-key': {
    id: 'hecates-key',
    name: "Hecate's Key",
    effect: 'You may split once more: a second split on the same hand.',
    onRules: () => ({ maxHands: 3 }),
  },
  tithe: {
    id: 'tithe',
    name: 'The Tithe',
    effect: 'Each win pays 2 extra blood. Each lost hand costs 1 more.',
    onWin: () => ({ blood: 2, note: 'Tithe +2' }),
    onLoss: () => ({ blood: -1, note: 'Tithe −1' }),
  },
  lantern: {
    id: 'lantern',
    name: 'The Lantern',
    effect: 'One extra hand on every floor before dawn.',
    onFloorStart: () => ({ hands: 1 }),
  },
};

export const RELIC_IDS = Object.keys(RELICS);

// Run every owned relic's hook of this name and collect the patches.
export function runHook(run, name, context = {}) {
  const patches = [];
  for (const id of run.relics) {
    const hook = RELICS[id]?.[name];
    if (!hook) continue;
    const patch = hook({ run, ...context });
    if (patch) patches.push({ id, ...patch });
  }
  return patches;
}

export function relicsView(run) {
  return run.relics.map((id) => {
    const r = RELICS[id];
    const spent = Boolean(r.active) && Boolean(run.flags.mirror);
    const ready = Boolean(r.active) && run.game.peekReady && !run.game.peeked && !spent;
    return { id, name: r.name, effect: r.effect, active: Boolean(r.active), usable: ready, spent };
  });
}

// Three relics you do not own yet, chosen by the run's seed (the seed is the only source).
export function choicesFor(seed, floor, owned) {
  const pool = RELIC_IDS.filter((id) => !owned.includes(id));
  let state = (Math.imul(seed >>> 0, 2654435761) + floor * 7919) >>> 0;
  const picks = [];
  while (picks.length < 3 && pool.length > 0) {
    const rolled = nextRng(state);
    state = rolled.rngState;
    picks.push(pool.splice(Math.floor(rolled.roll * pool.length), 1)[0]);
  }
  return picks;
}
