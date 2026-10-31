// What survives between evenings: the deepest floor, run counts, hints already
// given. Kept in the browser's local store under one key, passed in so tests can
// fake it. A broken or missing store never breaks the game; it just forgets.
export const META_KEY = 'vigil.meta.v1';

export function emptyMeta() {
  return { bestFloor: 0, runs: 0, escapes: 0, relicsSeen: [], hintsSeen: [] };
}

function clean(raw) {
  const base = emptyMeta();
  if (!raw || typeof raw !== 'object') return base;
  const int = (v) => (Number.isInteger(v) && v >= 0 && v < 1e6 ? v : 0);
  const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 40) : []);
  return {
    bestFloor: Math.min(3, int(raw.bestFloor)),
    runs: int(raw.runs),
    escapes: int(raw.escapes),
    relicsSeen: list(raw.relicsSeen),
    hintsSeen: list(raw.hintsSeen),
  };
}

export function loadMeta(storage) {
  try {
    const text = storage?.getItem(META_KEY);
    return text ? clean(JSON.parse(text)) : emptyMeta();
  } catch {
    return emptyMeta();
  }
}

export function saveMeta(storage, meta) {
  try {
    storage?.setItem(META_KEY, JSON.stringify(meta));
    return true;
  } catch {
    return false;
  }
}

export function resetMeta(storage) {
  try {
    storage?.removeItem(META_KEY);
  } catch {
    // nothing to forget
  }
  return emptyMeta();
}

export function noteFloor(meta, floor) {
  return floor > meta.bestFloor ? { ...meta, bestFloor: Math.min(3, floor) } : meta;
}

export function noteRelic(meta, id) {
  return meta.relicsSeen.includes(id) ? meta : { ...meta, relicsSeen: meta.relicsSeen.concat(id) };
}

export function markHint(meta, id) {
  return meta.hintsSeen.includes(id) ? meta : { ...meta, hintsSeen: meta.hintsSeen.concat(id) };
}

// Call once when a run ends. `reached` is the deepest floor of that run.
export function recordRun(meta, { status, reached }) {
  const next = noteFloor(meta, reached);
  return {
    ...next,
    runs: next.runs + 1,
    escapes: next.escapes + (status === 'won' ? 1 : 0),
  };
}

const ROMAN = ['', 'I', 'II', 'III'];

export function bestLabel(meta) {
  if (!meta.bestFloor) return '';
  const deep = `Deepest: Floor ${ROMAN[meta.bestFloor]}`;
  return meta.escapes > 0 ? `${deep} · Escaped ×${meta.escapes}` : deep;
}

// One-time hints in Vesper's voice, for a first run. Returns { id, text } or null.
export const HINTS = {
  welcome: (run) => `Reach ${run.quota} drops before the last candle gutters, and the stair opens. Fall short, and dawn comes for you.`,
  hunger: () => 'Every hand costs you a drop. Hunger is the house\'s oldest dealer.',
  bite: () => 'You may Bite: pay two drops, draw one more card. Keep it, or burn it.',
  relic: () => 'The tokens on the rim answer to you. Press and hold one to read it; tap to use it.',
};

export function hintFor(run, view, seen) {
  if (run.status !== 'playing' || run.floor !== 1) return null;
  const phase = view.phase;
  const want = [];
  if (phase === 'betting' && run.handsPlayed === 0) want.push('welcome');
  if (phase === 'betting' && run.handsPlayed >= 1) want.push('hunger');
  if (phase === 'player' && run.handsPlayed >= 1 && view.enabled.includes('bite')) want.push('bite');
  if (phase === 'player' && run.relics.length > 0) want.push('relic');
  const id = want.find((h) => !seen.includes(h));
  return id ? { id, text: HINTS[id](run) } : null;
}
