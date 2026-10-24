import { test } from 'node:test';
import assert from 'node:assert/strict';
import { betDown, betUp, createGame, deal, doubleDown, hit, nextHand, split, stand, withdraw } from '../src/game.js';
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
