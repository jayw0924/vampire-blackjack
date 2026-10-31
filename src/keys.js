// Keyboard shortcuts: H hit, S stand, D double, B bite, K keep, X burn, M the mirror,
// 1 2 3 choose a relic, + and - raise and lower the stake, Space deal / next hand / new evening.
const DIRECT = { h: 'hit', s: 'stand', d: 'double', b: 'bite', k: 'keep', x: 'burn', m: 'peek', '+': 'bet_up', '=': 'bet_up', '-': 'bet_down', '_': 'bet_down' };
const ID = {
  hit: 'hit', stand: 'stand', double: 'double', bite: 'bite', keep: 'keep', burn: 'burn',
  peek: 'relic-silver-mirror',
  bet_up: 'bet-up', bet_down: 'bet-down', deal: 'deal', next_hand: 'continue', new_evening: 'new-evening',
};

export function keyAction(key, enabled) {
  const k = String(key).toLowerCase();
  if (enabled.includes('pick') && ['1', '2', '3'].includes(k)) return `pick-${Number(k) - 1}`;
  let action = DIRECT[k] || null;
  if (k === ' ' || k === 'spacebar') {
    action = ['deal', 'next_hand', 'new_evening'].find((a) => enabled.includes(a)) || null;
  }
  if (!action || !enabled.includes(action)) return null;
  return ID[action];
}
