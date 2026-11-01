// Debug and screenshot parameters, kept in one place so real play cannot reach them by accident.
//
//   ?seed=7                 any host. A seed only picks the shuffle; it changes no rule or number.
//   ?floor= &blood= &relics= &hands= &quota=
//                           honoured ONLY on a dev host (localhost, 127.0.0.1, ::1, *.local)
//                           or when the page is opened with an explicit ?debug=1.
//
// A table opened with any of those overrides is a "rehearsal": it never reads or writes the
// saved record (best floor, hints), so it cannot change a real player's progress.
import { RELIC_IDS } from './relics.js';
import { TUNING } from './tuning.js';
import { BOSS_ORDER } from './bosses.js';

export function isDevHost(host) {
  const h = String(host || '').toLowerCase().replace(/^\[|\]$/g, '');
  return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.local');
}

const OVERRIDES = ['floor', 'blood', 'relics', 'hands', 'quota'];

export function parseStartOptions(search, host, now = 0) {
  const q = new URLSearchParams(search || '');
  const num = (key) => {
    const v = q.get(key);
    return v !== null && /^\d{1,9}$/.test(v) ? Number(v) : null;
  };
  const options = { seed: num('seed') ?? (now >>> 0) };
  const allowed = isDevHost(host) || q.get('debug') === '1';
  if (!allowed) return { options, rehearsal: false, ignored: OVERRIDES.filter((k) => q.has(k)) };

  const floor = num('floor');
  if (floor >= 1 && floor <= BOSS_ORDER.length) options.floor = floor;
  const blood = num('blood');
  if (blood !== null && blood >= 0 && blood <= 99) options.blood = blood;
  if (q.has('relics')) {
    options.relics = q.get('relics').split(',').filter((id) => RELIC_IDS.includes(id)).slice(0, 6);
  } else if (floor > 1) {
    options.relics = [];
  }
  const hands = num('hands');
  const quota = num('quota');
  if (hands || quota) {
    const tuning = JSON.parse(JSON.stringify(TUNING));
    for (const id of BOSS_ORDER) {
      if (hands) tuning.floors[id].hands = hands;
      if (quota) tuning.floors[id].quota = quota;
    }
    options.tuning = tuning;
  }
  const rehearsal = Object.keys(options).some((k) => k !== 'seed');
  return { options, rehearsal, ignored: [] };
}
