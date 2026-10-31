import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOTS, playRun, report } from '../tools/sim.mjs';
import { TUNING } from '../src/tuning.js';

test('a bot plays a whole run to an ending, the same way every time', () => {
  const a = playRun(BOTS.basic, 12);
  const b = playRun(BOTS.basic, 12);
  assert.deepEqual(a, b);
  assert.equal(['dawn', 'drained', 'won', 'withdrew'].includes(a.end), true);
  assert.equal(a.hands > 0, true);
});

test('the simulator reports a rate for every floor and bot', () => {
  const out = report(TUNING, 30);
  for (const name of ['casual', 'basic', 'skilled']) {
    const bot = out.bots[name];
    for (const id of ['steward', 'lamia', 'vesper']) {
      const f = bot.isolated[id];
      assert.equal(f.clear >= 0 && f.clear <= 100, true);
      assert.equal(Math.abs(f.clear + f.dawn + f.drained - 100) < 0.5, true, `${name} ${id}`);
    }
    assert.equal(bot.full.escapeRate <= bot.full.reachedF3, true);
  }
});

test('the shipped numbers are fair: a careful player usually clears floor I, and floor III is the hard one', () => {
  const out = report(TUNING, 400);
  const basic = out.bots.basic.isolated;
  assert.equal(basic.steward.clear >= 55 && basic.steward.clear <= 80, true, `floor I ${basic.steward.clear}`);
  assert.equal(basic.steward.clear > basic.lamia.clear, true);
  assert.equal(out.bots.skilled.full.escapeRate >= 15 && out.bots.skilled.full.escapeRate <= 45, true, `escape ${out.bots.skilled.full.escapeRate}`);
  assert.equal(out.bots.casual.full.escapeRate < out.bots.skilled.full.escapeRate, true);
});
