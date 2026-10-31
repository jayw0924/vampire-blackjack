import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, deal, publicView } from '../src/game.js';
import { FLOORS, act, createRun, isTerminal, legalRunActions, runView } from '../src/run.js';
import { TUNING } from '../src/tuning.js';
import { cards } from './helpers.js';

function started(options = {}) {
  return createRun({ seed: 3, relics: [], ...options });
}

// Put a known shoe on the run's table, keeping its rules.
function rig(run, shoe, blood = run.game.blood) {
  const game = createGame({ shoe: cards(...shoe), rules: run.game.rules });
  return { ...run, game: { ...game, blood } };
}

function playHand(run, moves = ['stand']) {
  let r = act(run, 'deal');
  for (const m of moves) if (r.game.phase === 'player') r = act(r, m);
  return r;
}

test('a run opens on a relic choice and the choice is seeded', () => {
  const a = createRun({ seed: 11 });
  const b = createRun({ seed: 11 });
  assert.equal(a.status, 'pick');
  assert.equal(a.choices.length, 3);
  assert.equal(new Set(a.choices).size, 3);
  assert.deepEqual(a.choices, b.choices);
  assert.deepEqual(legalRunActions(a), ['pick']);
  assert.throws(() => act(a, 'deal'), /illegal run action/);
  assert.throws(() => act(a, 'pick', 'not-a-relic'), /not on offer/);
  const picked = act(a, 'pick', a.choices[1]);
  assert.equal(picked.status, 'playing');
  assert.deepEqual(picked.relics, [a.choices[1]]);
  assert.equal(picked.floor, 1);
  assert.equal(picked.game.blood, TUNING.startBlood);
});

test('floor I is the gentle one: more hands, a lower quota, a lighter hunger', () => {
  const s = TUNING.floors.steward;
  const l = TUNING.floors.lamia;
  const v = TUNING.floors.vesper;
  assert.equal(s.hands > l.hands && l.hands >= v.hands, true);
  assert.equal(s.quota < l.quota && l.quota < v.quota, true);
  assert.equal(s.tax / (s.taxEvery ?? 1) < l.tax / (l.taxEvery ?? 1), true);
});

test('hunger takes blood after a hand, at the rate the floor sets', () => {
  let run = started({ floor: 2, blood: 30 });
  run = rig(run, ['10S', '9H', '10D', '8C']);
  const before = run.game.blood;
  run = playHand(run);
  const net = run.game.lastResult.net;
  assert.equal(run.game.blood, before + net - TUNING.floors.lamia.tax);
  assert.equal(run.handsPlayed, 1);
  assert.equal(run.lastSettle.items.some((i) => /Hunger/.test(i.label)), true);
});

test('floor I taxes every other hand', () => {
  let run = started({ blood: 20 });
  assert.equal(run.taxEvery, 2);
  run = rig(run, ['10S', '9H', '10D', '8C']);
  run = playHand(run);
  assert.equal(run.lastSettle.items.length, 0, 'no hunger after the first hand');
});

test('a hand ends nothing by itself until blood, quota or dawn says so', () => {
  let run = started({ blood: 20 });
  run = rig(run, ['10S', '9H', '10D', '8C']);
  run = playHand(run);
  assert.equal(run.status, 'playing');
  assert.equal(legalRunActions(run).includes('next_hand'), true);
});

test('reaching the quota offers a relic and takes the stair', () => {
  let run = started({ blood: 23 });
  run = rig(run, ['10S', '9H', 'KD', '8C'], 21);
  run = { ...run, game: { ...run.game, pendingBet: 4 } };
  run = playHand(run);
  assert.equal(run.status, 'pick');
  assert.equal(run.pickFor, 'descend');
  assert.equal(run.floorsCleared, 1);
  assert.equal(run.choices.length, 3);
  const view = runView(run);
  assert.equal(view.run.status, 'pick');
  const down = act(run, 'pick', run.choices[0]);
  assert.equal(down.floor, 2);
  assert.equal(down.bossId, 'lamia');
  assert.equal(down.game.rules.holeUp, true);
  assert.equal(down.game.rules.hitCost, 1);
  assert.equal(down.game.blood >= run.game.blood + TUNING.floors.lamia.bonus, true);
  assert.equal(down.relics.length, 1);
  assert.equal(down.handsPlayed, 0);
});

test('Lord Vesper stands on 18 and the core enforces it', () => {
  const run = started({ floor: 3, blood: 40 });
  assert.equal(run.bossId, 'vesper');
  assert.equal(run.game.rules.dealerStandOn, 18);
  let r = rig(run, ['10S', '10H', '8D', '7C', '2S']);
  r = playHand(r);
  assert.equal(r.game.dealerCards.length, 3);
});

test('dawn ends the evening when the hands run out', () => {
  const tuning = JSON.parse(JSON.stringify(TUNING));
  tuning.floors.steward.hands = 2;
  tuning.floors.steward.quota = 99;
  let run = createRun({ seed: 3, relics: [], tuning });
  for (let i = 0; i < 2; i += 1) {
    run = rig(run, ['10S', '9H', '10D', '9C'], run.game.blood);
    run = playHand(run);
    if (i === 0) run = act(run, 'next_hand');
  }
  assert.equal(run.status, 'dawn');
  assert.equal(isTerminal(run), true);
  assert.deepEqual(legalRunActions(run), ['new_evening']);
  assert.equal(runView(run).phase, 'over');
  assert.equal(runView(run).run.handsLeft, 0);
});

test('an empty cup ends the evening', () => {
  let run = started({ blood: 4 });
  run = rig(run, ['10S', '10H', '6D', '9C'], 4);
  run = { ...run, game: { ...run.game, pendingBet: 4 }, taxEvery: 1 };
  run = playHand(run, ['stand']);
  assert.equal(run.status, 'drained');
  const next = act(run, 'new_evening');
  assert.equal(next.status, 'pick');
  assert.notEqual(next.seed, run.seed);
});

test('clearing the last floor wins the run', () => {
  let run = started({ floor: FLOORS, blood: 47 });
  run = rig(run, ['10S', '9H', 'KD', '8C', '2D'], 45);
  run = { ...run, game: { ...run.game, pendingBet: 6 } };
  run = playHand(run);
  assert.equal(run.status, 'won');
});

test('the view never shows the hole card, but reports what is allowed to be known', () => {
  let run = rig(started(), ['10S', '9H', '5D', '7C', '2S']);
  run = act(run, 'deal');
  const view = runView(run);
  assert.equal(view.dealerCards[1].hidden, true);
  assert.equal(view.holeKnown, false);
  assert.equal(JSON.stringify(view).includes('"rank":"7"'), false);
  const face = rig(started({ floor: 2, blood: 30 }), ['10S', '9H', '5D', '7C', '2S']);
  assert.equal(runView(act(face, 'deal')).holeKnown, true);
});

test('the plate speaks in the dealer\'s own voice', () => {
  const run = started();
  const view = runView(run);
  assert.equal(view.run.boss.name, 'The Steward');
  assert.equal(view.message.length > 10, true);
  const v = runView(started({ floor: 3, blood: 40 }));
  assert.equal(v.run.boss.name, 'Lord Vesper');
  assert.notEqual(v.message, view.message);
});

test('a hand played twice from the same seed ends the same way', () => {
  const play = () => {
    let run = started({ seed: 77 });
    for (let i = 0; i < 4 && !isTerminal(run); i += 1) {
      run = playHand(run);
      if (run.game.phase === 'settled' && !isTerminal(run) && run.status === 'playing') run = act(run, 'next_hand');
    }
    return [run.game.blood, run.log.map((e) => e.result).join(',')];
  };
  assert.deepEqual(play(), play());
  assert.equal(typeof publicView(deal(createGame({ seed: 1 }))).blood, 'number');
});

test('his face follows the table: hungry on a Bite or low blood, amused when you bust', () => {
  let run = rig(started({ blood: 20 }), ['10S', '9H', '5D', '7C', '2S']);
  run = act(run, 'deal');
  assert.equal(runView(run).run.mood, 'neutral');
  assert.equal(runView(act(run, 'bite')).run.mood, 'hungry');
  let low = rig(started({ blood: 7 }), ['10S', '9H', '5D', '7C'], 7);
  assert.equal(runView(low).run.mood, 'hungry');
  let bust = rig(started({ blood: 20 }), ['10S', '9H', '6D', '7C', 'KS']);
  bust = act(act(bust, 'deal'), 'hit');
  assert.equal(runView(bust).run.mood, 'amused');
});
