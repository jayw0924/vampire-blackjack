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

test('B bites, K keeps, X burns, M uses the mirror, but only when each is legal', () => {
  assert.equal(keyAction('b', ['hit', 'stand', 'bite']), 'bite');
  assert.equal(keyAction('b', ['hit', 'stand']), null);
  assert.equal(keyAction('k', ['keep', 'burn']), 'keep');
  assert.equal(keyAction('x', ['keep', 'burn']), 'burn');
  assert.equal(keyAction('k', ['hit']), null);
  assert.equal(keyAction('m', ['hit', 'stand', 'peek']), 'relic-silver-mirror');
  assert.equal(keyAction('m', ['hit', 'stand']), null);
});

test('1, 2 and 3 choose a relic while a choice is open', () => {
  assert.equal(keyAction('1', ['pick']), 'pick-0');
  assert.equal(keyAction('3', ['pick']), 'pick-2');
  assert.equal(keyAction('2', ['deal']), null);
  assert.equal(keyAction(' ', ['pick']), null);
});

test('+ and - move the stake, only while betting', () => {
  const betting = ['bet_up', 'bet_down', 'deal', 'withdraw'];
  assert.equal(keyAction('+', betting), 'bet-up');
  assert.equal(keyAction('=', betting), 'bet-up');
  assert.equal(keyAction('-', betting), 'bet-down');
  assert.equal(keyAction('-', ['bet_up', 'deal']), null);
  assert.equal(keyAction('+', ['hit', 'stand']), null);
});
