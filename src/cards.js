export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS = ['S', 'H', 'D', 'C'];

export function card(rank, suit) {
  return { rank, suit };
}

export function rankValue(rank) {
  if (rank === 'A') return 11;
  if (rank === '10' || rank === 'J' || rank === 'Q' || rank === 'K') return 10;
  const value = Number(rank);
  if (!Number.isInteger(value) || value < 2 || value > 9) {
    throw new Error('illegal rank');
  }
  return value;
}

export function handValue(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += rankValue(c.rank);
    if (c.rank === 'A') aces += 1;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

export function isTenValue(c) {
  return c.rank === '10' || c.rank === 'J' || c.rank === 'Q' || c.rank === 'K';
}

export function isBlackjack(cards) {
  return cards.length === 2 && handValue(cards) === 21;
}

export function freshShoe() {
  const shoe = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      shoe.push(card(rank, suit));
    }
  }
  return shoe;
}

export function nextRng(rngState) {
  let a = rngState >>> 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const roll = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { roll, rngState: a >>> 0 };
}

export function shuffle(cards, rngState) {
  const next = cards.slice();
  let state = rngState >>> 0;
  for (let i = next.length - 1; i > 0; i -= 1) {
    const rolled = nextRng(state);
    state = rolled.rngState;
    const j = Math.floor(rolled.roll * (i + 1));
    const swap = next[i];
    next[i] = next[j];
    next[j] = swap;
  }
  return { cards: next, rngState: state };
}
