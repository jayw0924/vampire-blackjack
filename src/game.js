import { freshShoe, shuffle } from './cards.js';
import { RULES } from './rules.js';

function baseState(fields) {
  return {
    seed: fields.seed,
    rngState: fields.rngState,
    shoeInjected: fields.shoeInjected,
    shoe: fields.shoe,
    blood: RULES.startingBlood,
    phase: 'betting',
    pendingBet: RULES.minBet,
    playerHands: [],
    activeHand: 0,
    dealerCards: [],
    lastResult: null,
    evening: null,
    messageKey: 'betting',
  };
}

export function createGame({ seed = 1, shoe = null } = {}) {
  const rngState = seed >>> 0;
  if (shoe) {
    return baseState({
      seed: rngState,
      rngState,
      shoeInjected: true,
      shoe: shoe.map((c) => ({ rank: c.rank, suit: c.suit })),
    });
  }
  const shuffled = shuffle(freshShoe(), rngState);
  return baseState({
    seed: rngState,
    rngState: shuffled.rngState,
    shoeInjected: false,
    shoe: shuffled.cards,
  });
}

export function legalActions(game) {
  if (game.phase === 'over' || game.evening) return ['new_evening'];
  if (game.phase === 'betting') {
    const actions = [];
    if (game.pendingBet - 2 >= RULES.minBet) actions.push('bet_down');
    if (game.pendingBet + 2 <= Math.min(RULES.maxBet, game.blood)) actions.push('bet_up');
    if (game.blood >= game.pendingBet) actions.push('deal');
    actions.push('withdraw');
    return actions;
  }
  if (game.phase === 'player') return [];
  if (game.phase === 'settled') return ['next_hand'];
  return [];
}

function assertAction(game, action) {
  if (!legalActions(game).includes(action)) throw new Error('illegal action');
}

export function betUp(game) {
  assertAction(game, 'bet_up');
  return { ...game, pendingBet: game.pendingBet + 2 };
}

export function betDown(game) {
  assertAction(game, 'bet_down');
  return { ...game, pendingBet: game.pendingBet - 2 };
}

export function withdraw(game) {
  assertAction(game, 'withdraw');
  return { ...game, phase: 'over', evening: 'withdrew', messageKey: 'withdrew' };
}
