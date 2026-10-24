import { freshShoe, handValue, isBlackjack, shuffle } from './cards.js';
import { cueFor, remarkFor, roomFor, roomLine, storyFor } from './atmosphere.js';
import { lineFor } from './lines.js';
import { RULES, canSplitCards, outcomeFor, stakeReturned } from './rules.js';

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
    freshHeart: false,
    beats: { arrived: false, heartTold: false },
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
  if (game.phase === 'player') {
    const hand = game.playerHands[game.activeHand];
    const actions = [];
    if (!hand.stood && !hand.busted) actions.push('hit', 'stand');
    const opening = hand.cards.length === 2;
    if (opening && !hand.fromSplit && game.blood >= hand.bet) actions.push('double');
    if (
      game.playerHands.length === 1 &&
      opening &&
      canSplitCards(hand.cards[0], hand.cards[1]) &&
      game.blood >= hand.bet
    ) {
      actions.push('split');
    }
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
  let phase = 'settled';
  let evening = null;
  let messageKey = chooseMessage(game.playerHands, results, game.dealerCards, net);
  if (blood >= RULES.satedAt) {
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
  const hideHole = game.phase === 'player';
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
    while (handValue(dealerCards) < 17) {
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
  return advance({ ...game, shoe: drawn.shoe, playerHands: hands });
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
  const original = game.playerHands[0];
  const aces = original.cards[0].rank === 'A';
  let shoe = game.shoe;
  const n1 = drawOne(shoe); shoe = n1.shoe;
  const n2 = drawOne(shoe); shoe = n2.shoe;
  const extra = { fromSplit: true, splitAces: aces, stood: aces };
  const hands = [
    makeHand([original.cards[0], n1.drawn], original.bet, extra),
    makeHand([original.cards[1], n2.drawn], original.bet, extra),
  ];
  const next = {
    ...game,
    shoe,
    blood: game.blood - original.bet,
    playerHands: hands,
    activeHand: 0,
  };
  if (hands[0].stood && hands[1].stood) return resolveDealer(next);
  if (hands[0].stood) return { ...next, activeHand: 1, phase: 'player', messageKey: 'player_turn' };
  return { ...next, phase: 'player', messageKey: 'player_turn' };
}
