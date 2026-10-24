import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cueFor, remarkFor, roomFor, roomLine, storyFor, toneFor } from '../src/atmosphere.js';
import { cards } from './helpers.js';

test('the room follows blood and how the evening ended', () => {
  assert.equal(roomFor(20, null), 'composed');
  assert.equal(roomFor(12, null), 'hungry');
  assert.equal(roomFor(6, null), 'close');
  assert.equal(roomFor(32, null), 'flushed');
  assert.equal(roomFor(40, 'sated'), 'dismissal');
  assert.equal(roomFor(0, 'drained'), 'cellar');
  assert.equal(roomFor(20, 'withdrew'), 'departure');
  assert.match(roomLine('close'), /pulse/);
  assert.equal(toneFor('pulse').freq < toneFor('idle').freq, true);
  assert.equal(toneFor('cellar').gain > 0, true);
});

test('the Lord remarks on the hand he can see', () => {
  const stiff = remarkFor({
    phase: 'player',
    dealerCards: cards('5H', '3C'),
    playerHands: [{ cards: cards('10S', '6D') }],
    activeHand: 0,
  });
  assert.equal(stiff, 'A poor hand. The greedy ones hit.');
  const high = remarkFor({
    phase: 'player',
    dealerCards: cards('AS', '5C'),
    playerHands: [{ cards: cards('9S', '7H') }],
    activeHand: 0,
  });
  assert.equal(high, 'He shows a high card, and does not blink.');
  assert.equal(remarkFor({ phase: 'betting', dealerCards: [], playerHands: [], activeHand: 0 }), '');
});

test('stories happen once, and cues name the moment', () => {
  assert.match(storyFor({ phase: 'betting', evening: null, beats: { arrived: false } }), /coat/);
  assert.equal(storyFor({ phase: 'player', evening: null, beats: { arrived: true } }), '');
  assert.match(storyFor({ freshHeart: true, phase: 'betting', evening: null, beats: { arrived: true } }), /portraits/);
  assert.equal(cueFor({ phase: 'player', evening: null, room: 'composed', messageKey: 'player_turn' }), 'hand');
  assert.equal(cueFor({ phase: 'betting', evening: null, room: 'close', messageKey: 'low_blood' }), 'pulse');
  assert.equal(cueFor({ phase: 'over', evening: 'drained', room: 'cellar', messageKey: 'drained' }), 'cellar');
});
