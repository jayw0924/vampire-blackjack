import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyAction } from '../src/keys.js';

test('H, S and D press the matching button only when it is legal', () => {
  const turn = ['hit', 'stand', 'double'];
  assert.equal(keyAction('h', turn), 'hit');
  assert.equal(keyAction('S', turn), 'stand');
  assert.equal(keyAction('d', turn), 'double');
  assert.equal(keyAction('d', ['hit', 'stand']), null);
  assert.equal(keyAction('h', ['deal']), null);
});

test('Space deals, moves on, or begins another evening', () => {
  assert.equal(keyAction(' ', ['bet_up', 'deal', 'withdraw']), 'deal');
  assert.equal(keyAction(' ', ['next_hand']), 'continue');
  assert.equal(keyAction(' ', ['new_evening']), 'new-evening');
  assert.equal(keyAction(' ', ['hit', 'stand']), null);
  assert.equal(keyAction(' ', []), null);
  assert.equal(keyAction('x', ['deal']), null);
});
