import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOSSES, BOSS_ORDER, LINE_KEYS, bossFor, memoryKey, pickLine } from '../src/bosses.js';

const entry = (o) => ({ floor: 3, hand: 1, result: 'win', net: 2, doubled: false, bites: 0, peeked: false, bloodAfter: 20, ...o });

test('three bosses, in order, each with every line the table can ask for', () => {
  assert.deepEqual(BOSS_ORDER, ['steward', 'lamia', 'vesper']);
  for (const id of BOSS_ORDER) {
    const boss = BOSSES[id];
    for (const key of LINE_KEYS) {
      assert.equal(Array.isArray(boss.lines[key]) && boss.lines[key].length > 0, true, `${id}.${key}`);
      for (const line of boss.lines[key]) assert.equal(line.length > 8 && line.length < 140, true, `${id}.${key}: ${line}`);
    }
  }
  assert.equal(bossFor(1).id, 'steward');
  assert.equal(bossFor(3).id, 'vesper');
});

test('the lines are game lines: blood and the house, never money or luck', () => {
  for (const boss of Object.values(BOSSES)) {
    for (const pool of Object.values(boss.lines)) {
      for (const line of pool) {
        assert.equal(/\$|money|gambl|casino|jackpot|wager|odds|lucky strike|insurance/i.test(line), false, line);
      }
    }
  }
});

test('each boss changes exactly the rule his text says', () => {
  assert.deepEqual(BOSSES.steward.core, {});
  assert.deepEqual(BOSSES.lamia.core, { holeUp: true, hitCost: 1 });
  assert.deepEqual(BOSSES.vesper.core, { dealerStandOn: 18 });
  assert.match(BOSSES.vesper.ruleText, /18/);
  assert.match(BOSSES.lamia.ruleText, /face up/i);
});

test('a line is chosen by a salt, never at random', () => {
  const boss = BOSSES.vesper;
  assert.equal(pickLine(boss, 'player_win', 4), pickLine(boss, 'player_win', 4));
  assert.notEqual(pickLine(boss, 'player_win', 0), pickLine(boss, 'player_win', 1));
  assert.throws(() => pickLine(boss, 'nonsense', 0), /no line/);
});

test('he remembers streaks, doubles, and busts at low blood', () => {
  assert.equal(memoryKey([]), null);
  assert.equal(memoryKey([entry({ result: 'loss', net: -2 }), entry({ result: 'loss', net: -2 }), entry({ result: 'bust', net: -2 })]), 'loss_streak');
  assert.equal(memoryKey([entry({}), entry({}), entry({})]), 'win_streak');
  assert.equal(memoryKey([entry({ doubled: true, result: 'loss', net: -4 })]), 'double_lost');
  assert.equal(memoryKey([entry({ doubled: true, net: 4 })]), 'double_won');
  assert.equal(memoryKey([entry({ result: 'bust', net: -2, bloodAfter: 6 })]), 'bust_low');
  assert.equal(memoryKey([entry({ bites: 1 }), entry({ bites: 1 }), entry({ bites: 1, net: -1, result: 'loss' })]), 'bite_habit');
  assert.equal(memoryKey([entry({ peeked: true })]), 'mirror');
  assert.equal(memoryKey([entry({})]), null);
});
