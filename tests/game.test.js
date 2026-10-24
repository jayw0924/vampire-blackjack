import { test } from 'node:test';
import assert from 'node:assert/strict';
import { betDown, betUp, createGame, withdraw } from '../src/game.js';

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
