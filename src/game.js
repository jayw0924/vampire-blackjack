import { freshShoe, handValue, isBlackjack, shuffle } from './cards.js';
import { cueFor, remarkFor, roomFor, roomLine, storyFor } from './atmosphere.js';
import { lineFor } from './lines.js';
import { RULES, canSplitCards, outcomeFor, stakeReturned } from './rules.js';

// Table rules a floor can change. The defaults are the original single evening.
// A run layer passes overrides; the blackjack rules themselves do not move.
export const CORE_RULES = {
  dealerStandOn: 17, // the dealer draws below this total
  holeUp: false, // true: both dealer cards are face up
  hitCost: 0, // blood paid for each Hit
  biteEnabled: false,
  biteCost: 2,
  burnRefund: 0, // blood handed back when a bitten card is burned (never more than was paid)
  tiesToHouse: false, // a tie is a loss
  maxHands: 2, // 2 = split once; 3 = one resplit
  autoEnd: true, // false: the evening never ends by itself (a run decides)
  satedAt: RULES.satedAt, // null: no blood target ends the evening
  startBlood: RULES.startingBlood,
};

export function withRules(game, patch) {
  return { ...game, rules: { ...game.rules, ...patch } };
}

function baseState(fields) {
  return {
    rules: fields.rules,
    biteUsed: false,
    pendingBite: null,
    burned: [],
    peeked: false,
    peekReady: false,
    seed: fields.seed,
    rngState: fields.rngState,
    shoeInjected: fields.shoeInjected,
    shoe: fields.shoe,
    blood: fields.rules.startBlood,
    phase: 'betting',
    pendingBet: RULES.minBet,
    playerHands: [],
    activeHand: 0,
    dealerCards: [],
    lastResult: null,
    evening: null,
    messageKey: 'betting',
    freshHeart: false,
    beats: { arrived: false, heartTold: false },
  };
}

export function createGame({ seed = 1, shoe = null, rules = {} } = {}) {
  const rngState = seed >>> 0;
  const merged = { ...CORE_RULES, ...rules };
  if (shoe) {
    return baseState({
      rules: merged,
      seed: rngState,
      rngState,
      shoeInjected: true,
      shoe: shoe.map((c) => ({ rank: c.rank, suit: c.suit })),
    });
  }
  const shuffled = shuffle(freshShoe(), rngState);
  return baseState({
    rules: merged,
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
  if (game.phase === 'bite') return ['keep', 'burn'];
  if (game.phase === 'player') {
    const hand = game.playerHands[game.activeHand];
    const actions = [];
    const open = !hand.stood && !hand.busted;
    if (open && game.blood >= game.rules.hitCost) actions.push('hit');
    if (open) actions.push('stand');
    const opening = hand.cards.length === 2;
    if (opening && !hand.fromSplit && game.blood >= hand.bet) actions.push('double');
    if (
      game.playerHands.length < game.rules.maxHands &&
      opening &&
      canSplitCards(hand.cards[0], hand.cards[1]) &&
      game.blood >= hand.bet
    ) {
      actions.push('split');
    }
    if (open && game.rules.biteEnabled && !game.biteUsed && game.blood >= game.rules.biteCost) {
      actions.push('bite');
    }
    if (game.peekReady && !game.peeked && !game.rules.holeUp) actions.push('peek');
    return actions;
  }
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
  if (results.some((hand) => hand.tie) && results.every((hand) => hand.tie || hand.outcome !== 'win')) return 'tie_house';
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
    let outcome = outcomeFor(hand.cards, game.dealerCards, !hand.fromSplit);
    const tie = outcome === 'push' && game.rules.tiesToHouse;
    if (tie) outcome = 'loss';
    blood += stakeReturned(outcome, hand.bet);
    return { outcome, tie, bet: hand.bet, net: outcomeNet(outcome, hand.bet) };
  });
  const net = results.reduce((sum, hand) => sum + hand.net, 0);
  let phase = 'settled';
  let evening = null;
  let messageKey = chooseMessage(game.playerHands, results, game.dealerCards, net);
  if (!game.rules.autoEnd) {
    // a run layer decides when the evening ends
  } else if (game.rules.satedAt !== null && blood >= game.rules.satedAt) {
    phase = 'over';
    evening = 'sated';
    messageKey = 'sated';
  } else if (blood < RULES.minBet) {
    phase = 'over';
    evening = 'drained';
    messageKey = 'drained';
  }
  return {
    ...game,
    blood,
    phase,
    evening,
    messageKey,
    lastResult: { hands: results, net },
    activeHand: 0,
  };
}

function clampBet(blood, pending) {
  let bet = Math.min(pending, RULES.maxBet, blood);
  if (bet % 2 !== 0) bet -= 1;
  return bet;
}

export function nextHand(game) {
  assertAction(game, 'next_hand');
  const beats = { arrived: false, heartTold: false, ...(game.beats || {}) };
  const low = game.blood <= RULES.lowBlood;
  return {
    ...game,
    phase: 'betting',
    pendingBet: clampBet(game.blood, game.pendingBet),
    playerHands: [],
    dealerCards: [],
    activeHand: 0,
    lastResult: null,
    biteUsed: false,
    pendingBite: null,
    burned: [],
    peeked: false,
    peekReady: false,
    messageKey: low ? 'low_blood' : 'betting',
    freshHeart: low && !beats.heartTold,
    beats: { ...beats, arrived: true, heartTold: beats.heartTold || low },
  };
}

export function newEvening(game) {
  assertAction(game, 'new_evening');
  return createGame({ seed: (game.seed + 1) >>> 0 });
}

export function publicView(game) {
  const inHand = game.phase === 'player' || game.phase === 'bite';
  const hideHole = inHand && !game.rules.holeUp && !game.peeked;
  const dealerCards = hideHole
    ? [{ rank: game.dealerCards[0].rank, suit: game.dealerCards[0].suit }, { hidden: true }]
    : game.dealerCards.map((c) => ({ rank: c.rank, suit: c.suit }));
  const room = roomFor(game.blood, game.evening);
  return {
    blood: game.blood,
    phase: game.phase,
    pendingBet: game.pendingBet,
    playerHands: game.playerHands.map((hand) => ({
      ...hand,
      cards: hand.cards.map((c) => ({ rank: c.rank, suit: c.suit })),
    })),
    activeHand: game.activeHand,
    dealerCards,
    lastResult: game.lastResult,
    evening: game.evening,
    messageKey: game.messageKey,
    message: lineFor(game.messageKey),
    actions: legalActions(game),
    lowBlood: game.blood <= RULES.lowBlood,
    room,
    roomLine: roomLine(room),
    cue: cueFor({
      phase: game.phase,
      evening: game.evening,
      room,
      messageKey: game.messageKey,
    }),
    remark: remarkFor(game),
    story: storyFor(game),
    holeKnown: game.rules.holeUp || game.peeked,
    pendingBite: game.pendingBite
      ? { rank: game.pendingBite.card.rank, suit: game.pendingBite.card.suit, cost: game.pendingBite.cost }
      : null,
    burned: game.burned.map((c) => ({ rank: c.rank, suit: c.suit })),
    rules: {
      holeUp: game.rules.holeUp,
      dealerStandOn: game.rules.dealerStandOn,
      hitCost: game.rules.hitCost,
      biteEnabled: game.rules.biteEnabled,
      biteCost: game.rules.biteCost,
      burnRefund: game.rules.burnRefund,
      tiesToHouse: game.rules.tiesToHouse,
    },
  };
}

function withReadyShoe(game) {
  if (game.shoe.length >= RULES.reshuffleBelow || game.shoeInjected) return game;
  const shuffled = shuffle(freshShoe(), game.rngState);
  return { ...game, shoe: shuffled.cards, rngState: shuffled.rngState };
}

export function deal(game) {
  assertAction(game, 'deal');
  const ready = withReadyShoe(game);
  const marked = {
    ...ready,
    freshHeart: false,
    beats: { arrived: true, heartTold: Boolean(ready.beats?.heartTold) },
    biteUsed: false,
    pendingBite: null,
    burned: [],
    peeked: false,
  };
  let shoe = marked.shoe;
  const p1 = drawOne(shoe); shoe = p1.shoe;
  const d1 = drawOne(shoe); shoe = d1.shoe;
  const p2 = drawOne(shoe); shoe = p2.shoe;
  const d2 = drawOne(shoe); shoe = d2.shoe;
  const playerCards = [p1.drawn, p2.drawn];
  const dealerCards = [d1.drawn, d2.drawn];
  const next = {
    ...marked,
    shoe,
    blood: marked.blood - marked.pendingBet,
    playerHands: [makeHand(playerCards, marked.pendingBet)],
    dealerCards,
    activeHand: 0,
    lastResult: null,
  };
  if (isBlackjack(playerCards) || isBlackjack(dealerCards)) return settle(next);
  return { ...next, phase: 'player', messageKey: 'player_turn' };
}

function advance(game) {
  const hands = game.playerHands;
  const current = hands[game.activeHand];
  if (!current.stood && !current.busted) {
    return { ...game, phase: 'player', messageKey: 'player_turn' };
  }
  for (let i = game.activeHand + 1; i < hands.length; i += 1) {
    if (!hands[i].stood && !hands[i].busted) {
      return { ...game, activeHand: i, phase: 'player', messageKey: 'player_turn' };
    }
  }
  return resolveDealer(game);
}

function resolveDealer(game) {
  let shoe = game.shoe;
  let dealerCards = game.dealerCards.map((c) => ({ rank: c.rank, suit: c.suit }));
  if (game.playerHands.some((hand) => !hand.busted)) {
    while (handValue(dealerCards) < game.rules.dealerStandOn) {
      const drawn = drawOne(shoe);
      shoe = drawn.shoe;
      dealerCards = dealerCards.concat(drawn.drawn);
    }
  }
  return settle({ ...game, shoe, dealerCards });
}

export function hit(game) {
  assertAction(game, 'hit');
  const hands = game.playerHands.map((hand) => ({ ...hand, cards: hand.cards.slice() }));
  const hand = hands[game.activeHand];
  const drawn = drawOne(game.shoe);
  hand.cards = hand.cards.concat(drawn.drawn);
  const value = handValue(hand.cards);
  hand.busted = value > 21;
  hand.stood = hand.busted || value >= 21;
  return advance({
    ...game,
    shoe: drawn.shoe,
    blood: game.blood - game.rules.hitCost,
    playerHands: hands,
  });
}

// Bite: pay blood, draw one card, then keep it (it joins the hand) or burn it
// (it is shown face up and leaves the shoe). Once per hand.
export function bite(game) {
  assertAction(game, 'bite');
  const drawn = drawOne(game.shoe);
  const cost = game.rules.biteCost;
  return {
    ...game,
    shoe: drawn.shoe,
    blood: game.blood - cost,
    biteUsed: true,
    pendingBite: { card: drawn.drawn, cost },
    phase: 'bite',
    messageKey: 'bite',
  };
}

export function keep(game) {
  assertAction(game, 'keep');
  const hands = game.playerHands.map((hand) => ({ ...hand, cards: hand.cards.slice() }));
  const hand = hands[game.activeHand];
  hand.cards = hand.cards.concat(game.pendingBite.card);
  const value = handValue(hand.cards);
  hand.busted = value > 21;
  hand.stood = hand.busted || value >= 21;
  return advance({ ...game, playerHands: hands, pendingBite: null });
}

export function burn(game) {
  assertAction(game, 'burn');
  const refund = Math.min(game.rules.burnRefund, game.pendingBite.cost);
  return {
    ...game,
    blood: game.blood + refund,
    burned: game.burned.concat(game.pendingBite.card),
    pendingBite: null,
    phase: 'player',
    messageKey: 'burned',
  };
}

// An item (the Silver Mirror) arms a one-time look at the hole card.
export function arm(game) {
  return { ...game, peekReady: true };
}

export function peek(game) {
  assertAction(game, 'peek');
  return { ...game, peeked: true, peekReady: false, messageKey: 'peeked' };
}

export function stand(game) {
  assertAction(game, 'stand');
  const hands = game.playerHands.map((hand) => ({ ...hand, cards: hand.cards.slice() }));
  hands[game.activeHand].stood = true;
  return advance({ ...game, playerHands: hands });
}

export function doubleDown(game) {
  assertAction(game, 'double');
  const hands = game.playerHands.map((hand) => ({ ...hand, cards: hand.cards.slice() }));
  const hand = hands[game.activeHand];
  const drawn = drawOne(game.shoe);
  const added = hand.bet;
  hand.cards = hand.cards.concat(drawn.drawn);
  hand.bet = added * 2;
  hand.busted = handValue(hand.cards) > 21;
  hand.stood = true;
  return advance({
    ...game,
    shoe: drawn.shoe,
    blood: game.blood - added,
    playerHands: hands,
  });
}

export function split(game) {
  assertAction(game, 'split');
  const at = game.activeHand;
  const original = game.playerHands[at];
  const aces = original.cards[0].rank === 'A';
  let shoe = game.shoe;
  const n1 = drawOne(shoe); shoe = n1.shoe;
  const n2 = drawOne(shoe); shoe = n2.shoe;
  const extra = { fromSplit: true, splitAces: aces, stood: aces };
  const pair = [
    makeHand([original.cards[0], n1.drawn], original.bet, extra),
    makeHand([original.cards[1], n2.drawn], original.bet, extra),
  ];
  const hands = game.playerHands.slice(0, at).concat(pair, game.playerHands.slice(at + 1));
  const next = {
    ...game,
    shoe,
    blood: game.blood - original.bet,
    playerHands: hands,
    activeHand: at,
  };
  if (!pair[0].stood && !pair[0].busted) {
    return { ...next, phase: 'player', messageKey: 'player_turn' };
  }
  return advance(next);
}
