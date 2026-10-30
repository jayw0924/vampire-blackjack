// Keyboard shortcuts: H hit, S stand, D double, Space deal / next hand / new evening.
const DIRECT = { h: 'hit', s: 'stand', d: 'double' };
const ID = {
  hit: 'hit', stand: 'stand', double: 'double',
  deal: 'deal', next_hand: 'continue', new_evening: 'new-evening',
};

export function keyAction(key, enabled) {
  const k = String(key).toLowerCase();
  let action = DIRECT[k] || null;
  if (k === ' ' || k === 'spacebar') {
    action = ['deal', 'next_hand', 'new_evening'].find((a) => enabled.includes(a)) || null;
  }
  if (!action || !enabled.includes(action)) return null;
  return ID[action];
}
