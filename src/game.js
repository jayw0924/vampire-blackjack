import { freshShoe, handValue, isBlackjack, shuffle } from './cards.js';
import { RULES, outcomeFor, stakeReturned } from './rules.js';

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

function drawOne(shoe) {
  if (shoe.length === 0) throw new Error('shoe empty');
  return { drawn: { rank: shoe[0].rank, suit: shoe[0].suit }, shoe: shoe.slice(1) };
}

function makeHand(handCards, bet, extra = {}) {
  const value = handValue(handCards);
  const busted = value > 21;
  return {
    cards: handCards,
    bet,
    stood: Boolean(extra.stood) || busted || value >= 21,
    busted,
    fromSplit: Boolean(extra.fromSplit),
    splitAces: Boolean(extra.splitAces),
  };
}

function outcomeNet(outcome, bet) {
  return stakeReturned(outcome, bet) - bet;
}

function chooseMessage(playerHands, results, dealerCards, net) {
  if (playerHands.every((hand) => hand.busted)) return 'player_bust';
  if (results.some((hand) => hand.outcome === 'blackjack')) return 'player_blackjack';
  if (handValue(dealerCards) > 21 && net > 0) return 'dealer_bust';
  if (isBlackjack(dealerCards) && net < 0) return 'dealer_blackjack';
  if (net > 0) return 'player_win';
  if (net < 0) return 'player_loss';
  return 'push';
}

function settle(game) {
  let blood = game.blood;
  const results = game.playerHands.map((hand) => {
    const outcome = outcomeFor(hand.cards, game.dealerCards, !hand.fromSplit);
    blood += stakeReturned(outcome, hand.bet);
    return { outcome, bet: hand.bet, net: outcomeNet(outcome, hand.bet) };
  });
  const net = results.reduce((sum, hand) => sum + hand.net, 0);
  return {
    ...game,
    blood,
    phase: 'settled',
    evening: null,
    messageKey: chooseMessage(game.playerHands, results, game.dealerCards, net),
    lastResult: { hands: results, net },
    activeHand: 0,
  };
}

export function deal(game) {
  assertAction(game, 'deal');
  let shoe = game.shoe;
  const p1 = drawOne(shoe); shoe = p1.shoe;
  const d1 = drawOne(shoe); shoe = d1.shoe;
  const p2 = drawOne(shoe); shoe = p2.shoe;
  const d2 = drawOne(shoe); shoe = d2.shoe;
  const playerCards = [p1.drawn, p2.drawn];
  const dealerCards = [d1.drawn, d2.drawn];
  const next = {
    ...game,
    shoe,
    blood: game.blood - game.pendingBet,
    playerHands: [makeHand(playerCards, game.pendingBet)],
    dealerCards,
    activeHand: 0,
    lastResult: null,
  };
  if (isBlackjack(playerCards) || isBlackjack(dealerCards)) return settle(next);
  return { ...next, phase: 'player', messageKey: 'player_turn' };
}
