import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { RELICS, RELIC_IDS, choicesFor, relicsView } from '../src/relics.js';
import { act, createRun, legalRunActions, runView } from '../src/run.js';
import { cards } from './helpers.js';

function rigged(relics, shoe, { floor = 1, blood = 20, bet = 4 } = {}) {
  const run = createRun({ seed: 3, relics, floor, blood });
  const game = createGame({ shoe: cards(...shoe), rules: run.game.rules });
  return { ...run, game: { ...game, blood, pendingBet: bet } };
}

const BUST = ['10S', '10H', '6D', '7C', 'KS', 'QS', 'JS'];
const WIN = ['10S', '10H', 'KD', '8C'];
const LOSS = ['10S', '10H', '8D', '9C'];

function round(run, moves) {
  let r = act(run, 'deal');
  for (const m of moves) if (r.game.phase === 'player' || r.game.phase === 'bite') r = act(r, m);
  return r;
}

test('there are six relics, each with a name and an effect', () => {
  assert.equal(RELIC_IDS.length, 6);
  for (const id of RELIC_IDS) {
    assert.equal(RELICS[id].name.length > 3, true);
    assert.equal(RELICS[id].effect.length > 10, true);
  }
});

test('relic choices are three you do not own, from the seed alone', () => {
  const owned = ['tithe', 'lantern'];
  const a = choicesFor(5, 1, owned);
  assert.equal(a.length, 3);
  assert.equal(a.some((id) => owned.includes(id)), false);
  assert.deepEqual(a, choicesFor(5, 1, owned));
  assert.equal(choicesFor(5, 0, []).length, 3);
});

test("Charon's Obol refunds the first bust on each floor and no more", () => {
  let run = rigged(['charons-obol'], BUST, { blood: 20, bet: 4 });
  run = round(run, ['hit']);
  assert.equal(run.game.lastResult.hands[0].outcome, 'loss');
  assert.equal(run.lastSettle.items.some((i) => /Obol/.test(i.label)), true);
  assert.equal(run.game.blood, 20 - 4 + 2, 'the stake is lost, the obol returns 2');
  assert.equal(run.flags.obol, true);
  run = act(run, 'next_hand');
  run = { ...run, game: { ...createGame({ shoe: cards(...BUST), rules: run.game.rules }), blood: run.game.blood, pendingBet: 4 } };
  const before = run.game.blood;
  run = round(run, ['hit']);
  assert.equal(run.lastSettle.items.some((i) => /Obol/.test(i.label)), false, 'the second bust is not refunded');
  assert.equal(run.game.blood, before - 4 - 1, 'the stake and the hunger, nothing back');
});

test('The Tithe pays on a win and charges on a loss', () => {
  let won = round(rigged(['tithe'], WIN, { blood: 20, bet: 4 }), ['stand']);
  assert.equal(won.game.blood, 20 + 4 + 2);
  let lost = round(rigged(['tithe'], LOSS, { blood: 20, bet: 4 }), ['stand']);
  assert.equal(lost.game.blood, 20 - 4 - 1);
});

test("Lamia's Tooth makes the first Bite on a floor free", () => {
  let run = rigged(['lamias-tooth'], ['10S', '9H', '5D', '7C', '2S', '3H', '4C', '4D'], { blood: 20, bet: 4 });
  run = act(run, 'deal');
  const before = run.game.blood;
  run = act(run, 'bite');
  assert.equal(run.game.blood, before, 'free');
  run = act(run, 'burn');
  run = act(run, 'stand');
  run = act(run, 'next_hand');
  run = { ...run, game: { ...createGame({ shoe: cards('10S', '9H', '5D', '7C', '2S', '3H'), rules: run.game.rules }), blood: run.game.blood, pendingBet: 4 } };
  run = act(run, 'deal');
  const paid = run.game.blood;
  run = act(run, 'bite');
  assert.equal(run.game.blood, paid - 2);
});

test('The Lantern adds a hand to every floor', () => {
  const plain = createRun({ seed: 3, relics: [] });
  const lit = createRun({ seed: 3, relics: ['lantern'] });
  assert.equal(lit.handsTotal, plain.handsTotal + 1);
  assert.equal(runView(lit).run.candlesLit, lit.handsTotal);
});

test("Hecate's Key allows one more split", () => {
  const run = createRun({ seed: 3, relics: ['hecates-key'] });
  assert.equal(run.game.rules.maxHands, 3);
  assert.equal(createRun({ seed: 3, relics: [] }).game.rules.maxHands, 2);
});

test('the Silver Mirror shows the hole card once per floor', () => {
  let run = rigged(['silver-mirror'], ['10S', '9H', '5D', '7C', '2S', '3H', '4C', '4D'], { blood: 20, bet: 2 });
  run = act(run, 'deal');
  let view = runView(run);
  assert.equal(view.run.relics[0].usable, true);
  assert.equal(legalRunActions(run).includes('peek'), true);
  run = act(run, 'peek');
  view = runView(run);
  assert.equal(view.holeKnown, true);
  assert.equal(view.dealerCards[1].rank, '7');
  assert.equal(view.run.relics[0].spent, true);
  assert.equal(view.run.relics[0].usable, false);
  run = act(run, 'stand');
  run = act(run, 'next_hand');
  run = { ...run, game: { ...createGame({ shoe: cards('10S', '9H', '5D', '7C', '2S'), rules: run.game.rules }), blood: run.game.blood, pendingBet: 2 } };
  run = act(run, 'deal');
  assert.equal(legalRunActions(run).includes('peek'), false, 'spent for this floor');
  assert.equal(relicsView(run)[0].spent, true);
});

test('hooks that the relics define are the four the design names, plus the rules hooks', () => {
  const names = new Set();
  for (const r of Object.values(RELICS)) for (const k of Object.keys(r)) if (k.startsWith('on')) names.add(k);
  for (const hook of ['onBust', 'onWin', 'onDeal']) assert.equal(names.has(hook), true, hook);
});
