import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canSplitCards, outcomeFor, stakeReturned } from '../src/rules.js';
import { cards } from './helpers.js';

test('stakeReturned pays the locked table', () => {
  assert.equal(stakeReturned('loss', 2), 0);
  assert.equal(stakeReturned('push', 2), 2);
  assert.equal(stakeReturned('win', 2), 4);
  assert.equal(stakeReturned('blackjack', 2), 5);
  assert.equal(stakeReturned('blackjack', 10), 25);
  assert.equal(Number.isInteger(stakeReturned('blackjack', 10)), true);
});

test('outcomeFor distinguishes blackjack, bust, and push', () => {
  assert.equal(outcomeFor(cards('AS', 'KH'), cards('9H', '5C'), true), 'blackjack');
  assert.equal(outcomeFor(cards('AS', 'KH'), cards('AD', 'KD'), true), 'push');
  assert.equal(outcomeFor(cards('9S', '7H'), cards('AS', 'KH'), true), 'loss');
  assert.equal(outcomeFor(cards('10S', '6H', 'KD'), cards('9C', '5D'), true), 'loss');
  assert.equal(outcomeFor(cards('10S', '7H'), cards('6C', '9D', 'KC'), false), 'win');
  assert.equal(outcomeFor(cards('AS', 'KH'), cards('10S', '7H'), false), 'win');
  assert.equal(outcomeFor(cards('10S', '9H'), cards('10D', '9C'), true), 'push');
});

test('tens of any face can split and unlike ranks cannot', () => {
  const [eight, otherEight] = cards('8S', '8H');
  const [ten, king] = cards('10S', 'KH');
  const [tenAgain, nine] = cards('10S', '9H');
  const [ace, otherAce] = cards('AS', 'AH');
  const [aceAgain, kingAgain] = cards('AS', 'KS');
  assert.equal(canSplitCards(eight, otherEight), true);
  assert.equal(canSplitCards(ten, king), true);
  assert.equal(canSplitCards(tenAgain, nine), false);
  assert.equal(canSplitCards(ace, otherAce), true);
  assert.equal(canSplitCards(aceAgain, kingAgain), false);
});
