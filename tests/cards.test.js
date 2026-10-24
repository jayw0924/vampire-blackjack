import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handValue } from '../src/cards.js';
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
