import { test } from 'node:test';
import assert from 'node:assert/strict';
import { betDown, betUp, createGame, deal, doubleDown, hit, newEvening, nextHand, publicView, split, stand, withdraw } from '../src/game.js';
import { cards } from './helpers.js';

test('a new evening starts at 20 blood with a stake of 2', () => {
  const game = createGame({ seed: 1 });
  assert.equal(game.blood, 20);
  assert.equal(game.pendingBet, 2);
  assert.equal(game.phase, 'betting');
  assert.equal(game.evening, null);
  assert.equal(game.messageKey, 'betting');
  assert.equal(game.shoe.length, 52);
  assert.equal(game.shoeInjected, false);
});

test('stake moves by two drops inside the legal range', () => {
  let game = createGame({ seed: 1 });
  assert.throws(() => betDown(game), /illegal action/);
  game = betUp(game);
  game = betUp(game);
  game = betUp(game);
  game = betUp(game);
  assert.equal(game.pendingBet, 10);
  assert.throws(() => betUp(game), /illegal action/);
  game = betDown(game);
  assert.equal(game.pendingBet, 8);
  const poor = { ...createGame({ seed: 1 }), blood: 4, pendingBet: 4 };
  assert.throws(() => betUp(poor), /illegal action/);
});

test('leaving the table ends the evening without taking blood', () => {
  const game = createGame({ seed: 1 });
  const left = withdraw(game);
  assert.equal(left.evening, 'withdrew');
  assert.equal(left.phase, 'over');
  assert.equal(left.blood, 20);
  assert.equal(left.messageKey, 'withdrew');
  assert.throws(() => withdraw(left), /illegal action/);
});

test('an injected shoe is dealt player, dealer, player, dealer', () => {
  const game = createGame({ shoe: cards('AS', '9H', 'KH', '5C') });
  const before = structuredClone(game);
  const dealt = deal(game);
  assert.deepEqual(game, before);
  assert.deepEqual(dealt.playerHands[0].cards, cards('AS', 'KH'));
  assert.deepEqual(dealt.dealerCards, cards('9H', '5C'));
  assert.equal(dealt.shoe.length, 0);
});

test('a player natural pays 3 to 2 and the dealer does not draw', () => {
  const dealt = deal(createGame({ shoe: cards('AS', '9H', 'KH', '5C', '2D') }));
  assert.equal(dealt.phase, 'settled');
  assert.equal(dealt.blood, 23);
  assert.equal(dealt.lastResult.net, 3);
  assert.equal(dealt.lastResult.hands[0].outcome, 'blackjack');
  assert.equal(dealt.messageKey, 'player_blackjack');
  assert.equal(dealt.dealerCards.length, 2);
  assert.deepEqual(dealt.shoe[0], { rank: '2', suit: 'D' });
  assert.throws(() => deal(dealt), /illegal action/);
});

test('a dealer natural takes the stake before the player acts', () => {
  const dealt = deal(createGame({ shoe: cards('9S', 'AS', '7H', 'KH') }));
  assert.equal(dealt.phase, 'settled');
  assert.equal(dealt.blood, 18);
  assert.equal(dealt.lastResult.net, -2);
  assert.equal(dealt.messageKey, 'dealer_blackjack');
  assert.equal(dealt.playerHands[0].cards.length, 2);
});

test('both naturals push', () => {
  const dealt = deal(createGame({ shoe: cards('AS', 'AH', 'KH', 'KD') }));
  assert.equal(dealt.blood, 20);
  assert.equal(dealt.lastResult.net, 0);
  assert.equal(dealt.lastResult.hands[0].outcome, 'push');
  assert.equal(dealt.messageKey, 'push');
});

test('a bust loses immediately and the dealer does not draw', () => {
  let game = deal(createGame({ shoe: cards('10S', '5H', '6D', '9C', 'KC', 'AS') }));
  assert.equal(game.phase, 'player');
  game = hit(game);
  assert.equal(game.phase, 'settled');
  assert.equal(game.playerHands[0].busted, true);
  assert.equal(game.blood, 18);
  assert.equal(game.lastResult.net, -2);
  assert.equal(game.messageKey, 'player_bust');
  assert.equal(game.dealerCards.length, 2);
  assert.deepEqual(game.shoe[0], { rank: 'A', suit: 'S' });
});

test('the dealer hits 16 and stands on soft 17', () => {
  let hits = deal(createGame({ shoe: cards('10S', '10H', '8D', '6C', '2H') }));
  hits = stand(hits);
  assert.equal(hits.dealerCards.length, 3);
  assert.equal(hits.blood, 20);
  assert.equal(hits.lastResult.hands[0].outcome, 'push');
  assert.equal(hits.messageKey, 'push');

  let soft = deal(createGame({ shoe: cards('10S', 'AH', 'QS', '6D', 'KH') }));
  soft = stand(soft);
  assert.equal(soft.dealerCards.length, 2);
  assert.deepEqual(soft.shoe[0], { rank: 'K', suit: 'H' });
  assert.equal(soft.blood, 22);
  assert.equal(soft.messageKey, 'player_win');
});

test('double down doubles the stake, draws one card, and stands', () => {
  let game = deal(createGame({ shoe: cards('5S', '6H', '6D', '10C', '10H', 'QS') }));
  assert.equal(game.blood, 18);
  game = doubleDown(game);
  assert.equal(game.playerHands[0].bet, 4);
  assert.equal(game.playerHands[0].cards.length, 3);
  assert.equal(game.playerHands[0].stood, true);
  assert.equal(game.blood, 24);
  assert.equal(game.lastResult.net, 4);
  assert.equal(game.messageKey, 'dealer_bust');
  const unaffordable = deal(createGame({ shoe: cards('5S', '6H', '6D', '10C', '10H') }));
  const broke = { ...unaffordable, blood: 1 };
  assert.throws(() => doubleDown(broke), /illegal action/);
});

test('split plays the first hand before the second', () => {
  let game = deal(createGame({ shoe: cards('8S', '6C', '8H', '9D', '6H', '10S', 'KS', '7C') }));
  assert.equal(game.blood, 18);
  game = split(game);
  assert.equal(game.blood, 16);
  assert.equal(game.phase, 'player');
  assert.equal(game.activeHand, 0);
  assert.equal(game.playerHands[0].cards.length, 2);
  assert.equal(game.playerHands[1].cards.length, 2);
  game = hit(game);
  assert.equal(game.playerHands[0].busted, true);
  assert.equal(game.activeHand, 1);
  assert.equal(game.phase, 'player');
  game = stand(game);
  assert.equal(game.phase, 'settled');
  assert.equal(game.blood, 20);
  assert.equal(game.lastResult.net, 0);
  assert.deepEqual(
    game.lastResult.hands.map((hand) => hand.outcome),
    ['loss', 'win'],
  );
  assert.equal(game.messageKey, 'push');
});

test('split aces take one card each and are not naturals', () => {
  const game = split(deal(createGame({ shoe: cards('AS', 'KH', 'AH', '9D', 'KS', '8C') })));
  assert.notEqual(game.phase, 'player');
  assert.equal(game.playerHands[0].fromSplit, true);
  assert.equal(game.playerHands[0].splitAces, true);
  assert.equal(game.playerHands[0].cards.length, 2);
  assert.equal(game.playerHands[1].cards.length, 2);
  assert.equal(game.lastResult.hands[0].outcome, 'win');
  assert.equal(game.lastResult.hands[1].outcome, 'push');
  assert.equal(game.blood, 22);
  assert.equal(game.lastResult.net, 2);
  assert.equal(game.dealerCards.length, 2);
  assert.throws(() => hit(game), /illegal action/);
  assert.throws(() => doubleDown({
    ...game,
    phase: 'player',
    activeHand: 0,
    playerHands: game.playerHands.map((hand) => ({ ...hand, stood: false })),
  }), /illegal action/);
});

function repeatShoe(ids, times) {
  const all = [];
  for (let i = 0; i < times; i += 1) all.push(...ids);
  return cards(...all);
}

test('ten losses drain the evening', () => {
  let game = createGame({ shoe: repeatShoe(['10S', 'KH', '6H', '7D'], 10) });
  for (let i = 0; i < 9; i += 1) {
    game = stand(deal(game));
    assert.equal(game.phase, 'settled');
    game = nextHand(game);
  }
  game = stand(deal(game));
  assert.equal(game.blood, 0);
  assert.equal(game.phase, 'over');
  assert.equal(game.evening, 'drained');
  assert.equal(game.messageKey, 'drained');
  assert.throws(() => nextHand(game), /illegal action/);
});

test('ten wins end the evening sated at 40', () => {
  let game = createGame({ shoe: repeatShoe(['10S', '10H', '9D', '7C'], 10) });
  for (let i = 0; i < 9; i += 1) {
    game = stand(deal(game));
    game = nextHand(game);
  }
  game = stand(deal(game));
  assert.equal(game.blood, 40);
  assert.equal(game.phase, 'over');
  assert.equal(game.evening, 'sated');
  assert.equal(game.messageKey, 'sated');
  assert.equal(game.lastResult.net, 2);
});

test('a short live shoe is reshuffled and an injected shoe is not', () => {
  const live = createGame({ seed: 1 });
  const short = { ...live, shoe: live.shoe.slice(0, 10), shoeInjected: false };
  const dealt = deal(short);
  assert.equal(short.shoe.length, 10);
  assert.equal(dealt.shoe.length, 48);
  assert.equal(dealt.playerHands[0].cards.length, 2);
  assert.equal(dealt.dealerCards.length, 2);

  const scripted = deal(createGame({ shoe: cards('AS', '9H', 'KH', '5C', '2D') }));
  assert.equal(scripted.shoe.length, 1);
  assert.deepEqual(scripted.playerHands[0].cards, cards('AS', 'KH'));
});

test('the public view hides the hole card and omits the shoe', () => {
  const dealt = deal(createGame({ shoe: cards('10S', '5H', '6D', '3C', '9H') }));
  assert.equal(dealt.phase, 'player');
  const view = publicView(dealt);
  assert.deepEqual(Object.keys(view).sort(), [
    'actions', 'activeHand', 'blood', 'burned', 'cue', 'dealerCards', 'evening',
    'holeKnown', 'lastResult', 'lowBlood', 'message', 'messageKey', 'pendingBet',
    'pendingBite', 'phase', 'playerHands', 'remark', 'room', 'roomLine', 'rules', 'story',
  ]);
  assert.equal(view.holeKnown, false);
  assert.equal(view.pendingBite, null);
  assert.deepEqual(view.burned, []);
  assert.equal(view.dealerCards[1].hidden, true);
  assert.equal('rank' in view.dealerCards[1], false);
  assert.equal(JSON.stringify(view).includes('"rank":"3"'), false);
  assert.equal(view.message, 'The hand is yours.');
  const shown = publicView(stand(dealt));
  assert.equal(shown.dealerCards[1].hidden, undefined);
  assert.equal(shown.dealerCards[1].rank, '3');
});

test('next hand clamps an unaffordable stake and warns when blood is low', () => {
  const settled = {
    ...createGame({ seed: 1 }),
    phase: 'settled',
    blood: 5,
    pendingBet: 10,
    evening: null,
  };
  const next = nextHand(settled);
  assert.equal(next.pendingBet, 4);
  assert.equal(next.phase, 'betting');
  assert.equal(next.messageKey, 'low_blood');
  assert.equal(next.playerHands.length, 0);
  assert.equal(next.lastResult, null);
});

test('another evening starts over at 20 and does not reuse the seed', () => {
  const left = withdraw(createGame({ seed: 7 }));
  const again = newEvening(left);
  assert.equal(again.blood, 20);
  assert.equal(again.phase, 'betting');
  assert.equal(again.seed, 8);
  assert.equal(again.evening, null);
  assert.throws(() => newEvening(createGame({ seed: 7 })), /illegal action/);
});

test('the parlor reacts without changing the hand', () => {
  const arrival = publicView(createGame({ seed: 3 }));
  assert.equal(arrival.room, 'composed');
  assert.equal(arrival.cue, 'idle');
  assert.match(arrival.story, /coat/);
  assert.equal(arrival.remark, '');

  const stiff = publicView(deal(createGame({ shoe: cards('10S', '5H', '6D', '3C', '9H') })));
  assert.equal(stiff.message, 'The hand is yours.');
  assert.equal(stiff.remark, 'A poor hand. The greedy ones hit.');
  assert.equal(stiff.cue, 'hand');
  assert.equal(stiff.story, '');
  assert.equal(JSON.stringify(stiff).includes('"rank":"3"'), false);

  const high = publicView(deal(createGame({ shoe: cards('9S', 'AS', '7H', '5C') })));
  assert.equal(high.remark, 'He shows a high card, and does not blink.');

  const pat = publicView(deal(createGame({ shoe: cards('10S', '6H', '9D', '5C') })));
  assert.equal(pat.remark, 'You could stand. The patient ones do.');

  const low = nextHand({
    ...createGame({ seed: 1 }),
    phase: 'settled',
    blood: 5,
    pendingBet: 2,
    evening: null,
  });
  const lowView = publicView(low);
  assert.equal(lowView.room, 'close');
  assert.equal(lowView.cue, 'pulse');
  assert.match(lowView.story, /portraits/);
  const second = publicView(nextHand({ ...low, phase: 'settled' }));
  assert.equal(second.story, '');

  const drained = publicView({
    ...createGame({ seed: 1 }),
    phase: 'over',
    evening: 'drained',
    blood: 0,
    messageKey: 'drained',
  });
  assert.equal(drained.room, 'cellar');
  assert.equal(drained.cue, 'cellar');
  assert.match(drained.story, /downstairs/);
});
