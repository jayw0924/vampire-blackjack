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
  // the curve falls from floor I to III for every bot
  for (const name of ['casual', 'basic', 'skilled']) {
    const f = out.bots[name].isolated;
    assert.equal(f.steward.clear > f.lamia.clear && f.lamia.clear > f.vesper.clear, true, `${name}: ${f.steward.clear}/${f.lamia.clear}/${f.vesper.clear}`);
  }
  const e = (n) => out.bots[n].full.escapeRate;
  assert.equal(e('casual') >= 3 && e('casual') <= 12, true, `casual ${e('casual')}`);
  assert.equal(e('basic') >= 12 && e('basic') <= 25, true, `basic ${e('basic')}`);
  assert.equal(e('skilled') >= 22 && e('skilled') <= 40, true, `skilled ${e('skilled')}`);
  assert.equal(e('casual') < e('basic') && e('basic') < e('skilled'), true);
});

test('Bite pays for a skilled player at the shipped price', () => {
  const out = report(TUNING, 1500);
  const shipped = out.bite.find((row) => row.cost === TUNING.bite.cost && row.refund === (TUNING.bite.refund ?? 0));
  assert.equal(shipped.with - shipped.without >= 1.5, true, `${shipped.with} vs ${shipped.without}`);
});
