import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  arm, betUp, bite, burn, createGame, deal, hit, keep, legalActions, peek, publicView, stand,
} from '../src/game.js';
import { cards } from './helpers.js';

// Shoe order: you, dealer, you, dealer, then draws.
function table(shoe, rules = {}) {
  return deal(createGame({ shoe: cards(...shoe), rules: { biteEnabled: true, autoEnd: false, ...rules } }));
}

test('the Bite is off at the original table and costs blood where it is on', () => {
  const plain = deal(createGame({ shoe: cards('10S', '9H', '5D', '7C', '2S') }));
  assert.equal(legalActions(plain).includes('bite'), false);
  const game = table(['10S', '9H', '5D', '7C', '2S']);
  assert.equal(legalActions(game).includes('bite'), true);
  const bitten = bite(game);
  assert.equal(bitten.blood, game.blood - 2);
  assert.equal(bitten.phase, 'bite');
  assert.deepEqual(legalActions(bitten), ['keep', 'burn']);
  const poor = { ...game, blood: 1 };
  assert.equal(legalActions(poor).includes('bite'), false);
});

test('keeping the bitten card puts it in your hand', () => {
  let game = table(['10S', '9H', '5D', '7C', '2S']);
  game = bite(game);
  assert.equal(publicView(game).pendingBite.rank, '2');
  game = keep(game);
  assert.equal(game.playerHands[0].cards.length, 3);
  assert.equal(game.phase, 'player');
  assert.equal(game.pendingBite, null);
  assert.equal(legalActions(game).includes('bite'), false, 'once per hand');
});

test('burning shows the card and takes it out of the shoe', () => {
  let game = table(['10S', '9H', '5D', '7C', '2S', '3H']);
  game = bite(game);
  game = burn(game);
  assert.equal(game.phase, 'player');
  assert.equal(game.playerHands[0].cards.length, 2);
  assert.deepEqual(publicView(game).burned.map((c) => c.rank), ['2']);
  game = hit(game);
  assert.equal(game.playerHands[0].cards[2].rank, '3', 'the burned card does not come back');
});

test('keeping a card that busts you ends the hand', () => {
  let game = table(['10S', '9H', '6D', '7C', 'KS']);
  game = bite(game);
  game = keep(game);
  assert.equal(game.phase, 'settled');
  assert.equal(game.lastResult.hands[0].outcome, 'loss');
});

test('a dealer who stands on 18 draws to 17', () => {
  let game = table(['10S', '10H', '8D', '7C', '2S'], { dealerStandOn: 18 });
  game = stand(game);
  assert.equal(game.dealerCards.length, 3);
  const plain = stand(deal(createGame({ shoe: cards('10S', '10H', '8D', '7C', '2S'), rules: { autoEnd: false } })));
  assert.equal(plain.dealerCards.length, 2);
});

test('both dealer cards are face up where the rule says so, and a Hit costs blood', () => {
  let game = table(['10S', '9H', '5D', '7C', '2S'], { holeUp: true, hitCost: 1 });
  assert.equal(publicView(game).dealerCards.some((c) => c.hidden), false);
  assert.equal(publicView(game).holeKnown, true);
  const before = game.blood;
  game = hit(game);
  assert.equal(game.blood, before - 1);
  const broke = { ...game, blood: 0 };
  assert.equal(legalActions(broke).includes('hit'), false);
});

test('the hole card stays hidden until a mirror is used, once', () => {
  let game = table(['10S', '9H', '5D', '7C', '2S']);
  assert.equal(publicView(game).dealerCards[1].hidden, true);
  assert.equal(legalActions(game).includes('peek'), false);
  assert.throws(() => peek(game), /illegal action/);
  game = arm(game);
  assert.equal(legalActions(game).includes('peek'), true);
  game = peek(game);
  const view = publicView(game);
  assert.equal(view.dealerCards[1].hidden, undefined);
  assert.equal(view.dealerCards[1].rank, '7');
  assert.equal(view.holeKnown, true);
  assert.equal(legalActions(game).includes('peek'), false);
});

test('a second split needs the room for it', () => {
  const pair = ['8S', '9H', '8D', '7C', '8H', '3S', '8C', '2D', '9S', '4H'];
  let game = table(pair, { maxHands: 3 });
  assert.equal(legalActions(game).includes('split'), true);
});
