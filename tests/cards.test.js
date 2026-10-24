import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshShoe, handValue, shuffle } from '../src/cards.js';
import { cards } from './helpers.js';

test('face cards and numbers score by rank', () => {
  assert.equal(handValue(cards('KS', '9H')), 19);
  assert.equal(handValue(cards('10D', 'QD')), 20);
  assert.equal(handValue(cards('7C', '8S', '6H')), 21);
});

test('aces drop from 11 to 1 to avoid busting', () => {
  assert.equal(handValue(cards('AS', 'AH')), 12);
  assert.equal(handValue(cards('AS', '6H')), 17);
  assert.equal(handValue(cards('AS', '6H', '5D')), 12);
  assert.equal(handValue(cards('AS', 'AH', '9C')), 21);
  assert.equal(handValue(cards('AS', 'AH', '9C', '9D')), 20);
  assert.equal(handValue(cards('10S', '6H', 'KD')), 26);
});

test('a fresh shoe has 52 unique cards', () => {
  const shoe = freshShoe();
  const keys = shoe.map((c) => `${c.rank}${c.suit}`);
  assert.equal(shoe.length, 52);
  assert.equal(new Set(keys).size, 52);
  assert.equal(shoe.filter((c) => c.rank === 'A').length, 4);
  assert.equal(shoe.filter((c) => ['10', 'J', 'Q', 'K'].includes(c.rank)).length, 16);
});

test('shuffle is deterministic and keeps every card', () => {
  const first = shuffle(freshShoe(), 1);
  const second = shuffle(freshShoe(), 1);
  const other = shuffle(freshShoe(), 2);
  assert.deepEqual(first.cards, second.cards);
  assert.notDeepEqual(first.cards, other.cards);
  assert.equal(first.cards.length, 52);
  assert.equal(new Set(first.cards.map((c) => `${c.rank}${c.suit}`)).size, 52);
  assert.equal(Number.isInteger(first.rngState), true);
});
