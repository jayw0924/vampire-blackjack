import { test } from 'node:test';
import assert from 'node:assert/strict';
import { present } from '../src/render.js';
import { createGame, deal, publicView, stand, hit } from '../src/game.js';
import { TIMING, needsStaging, stageSteps } from '../src/stage.js';
import { cards } from './helpers.js';

// Player 10+8 stands on 18. Dealer: 6 + 5 and a hole of 3, draws 4 (18 -> stands).
function standingGame() {
  const start = createGame({ shoe: cards('10S', '6H', '8D', '5C', '3S', '4D', '9S', '2C', '7H') });
  return deal(start);
}

test('only a hand that settles after the player acts is staged', () => {
  const live = present(publicView(standingGame()));
  assert.equal(needsStaging('player', live), false, 'still the player turn');
  const settled = present(publicView(stand(standingGame())));
  assert.equal(needsStaging('player', settled), true);
  assert.equal(needsStaging('settled', settled), false);
  assert.equal(needsStaging('betting', { ...settled, dealerCards: [] }), false);
});

test('the scene shows his up card and a face-down hole, then reveals, then draws, then judges', () => {
  const before = present(publicView(standingGame()));
  const final = present(publicView(stand(standingGame())));
  assert.equal(final.dealerCards.length >= 3, true);
  const steps = stageSteps(final, before, 0);

  // time moves forward and the last step is the untouched verdict
  for (let i = 1; i < steps.length; i += 1) assert.equal(steps[i].at > steps[i - 1].at, true);
  assert.equal(steps.at(-1).view, final);
  assert.equal(steps[0].at, 0);
  assert.equal(steps[1].at, TIMING.beat);

  // the first picture has no hole card face up, no dealer total, no result
  const first = steps[0].view;
  assert.equal(first.dealerCards.length, 2);
  assert.equal(first.dealerCards[1].hidden, true);
  assert.equal(first.dealerCards[1].label, '');
  assert.equal(first.dealerValueLabel, '');
  assert.equal(first.ledger, '');
  assert.equal(first.stamp, '');
  assert.deepEqual(first.enabled, []);
  assert.equal(first.playerHands.every((h) => h.outcomeLabel === ''), true);
  const holeLabel = final.dealerCards[1].label;
  assert.equal(JSON.stringify(first).includes(holeLabel), false, 'the hole card leaked into the first scene');

  // dealer cards grow one at a time
  const counts = steps.slice(1, -1).map((s) => s.view.dealerCards.length);
  assert.deepEqual(counts, [...counts].sort((a, b) => a - b));
  assert.equal(counts[0], 2);
  assert.equal(counts.at(-1), final.dealerCards.length);
  assert.equal(steps.slice(1, -1).every((s) => s.view.dealerCards.every((c) => !c.hidden)), true);
});

test('the old room stays until the verdict', () => {
  const before = present(publicView(standingGame()));
  const final = present(publicView(stand(standingGame())));
  const steps = stageSteps(final, { ...before, room: 'hungry', candleCount: 2 }, 0);
  assert.equal(steps[0].view.room, 'hungry');
  assert.equal(steps[0].view.candleCount, 2);
  assert.equal(steps.at(-1).view.room, final.room);
});

test('cards still travelling in push the dealer beat back', () => {
  const before = present(publicView(standingGame()));
  const final = present(publicView(stand(standingGame())));
  const quick = stageSteps(final, before, 0)[1].at;
  const afterDeal = stageSteps(final, before, 4)[1].at;
  assert.equal(afterDeal, quick + 4 * TIMING.deal + TIMING.dealIn);
});

test('a bust never makes the dealer draw, but the hole card is still turned', () => {
  const start = deal(createGame({ shoe: cards('10S', '6H', '8D', '5C', '9S', '4D') }));
  const busted = hit(start);
  const view = present(publicView(busted));
  assert.equal(view.phase, 'settled');
  assert.equal(view.stamp, 'Bust');
  assert.equal(view.playerHands[0].outcomeLabel, 'Bust');
  assert.equal(view.dealerCards.length, 2);
  const steps = stageSteps(view, present(publicView(start)), 0);
  assert.equal(steps.length, 3);
});

import { act, createRun, runView } from '../src/run.js';
import { createGame as newGame } from '../src/game.js';

function lamiaTable(shoe) {
  const run = createRun({ seed: 3, relics: [], floor: 2, blood: 30 });
  const game = newGame({ shoe: cards(...shoe), rules: run.game.rules });
  return act({ ...run, game: { ...game, blood: 30, pendingBet: 2 } }, 'deal');
}

test('a face-up hole card is not turned over again for the dealer scene', () => {
  const run = act(lamiaTable(['10S', '9H', '10D', '7C', '2S']), 'stand');
  const view = present(runView(run));
  const steps = stageSteps(view, null, 0);
  assert.equal(view.holeKnown, true);
  assert.equal(steps[0].view.dealerCards.some((c) => c.hidden), false);
  assert.equal(steps[0].view.dealerValueLabel, '16');
});

test('the dealer scene reads the table\'s stand rule, not 17', () => {
  const run = createRun({ seed: 3, relics: [], floor: 3, blood: 40 });
  const game = newGame({ shoe: cards('10S', '10H', '8D', '7C', '2S'), rules: run.game.rules });
  let r = act({ ...run, game: { ...game, blood: 40, pendingBet: 2 } }, 'deal');
  r = act(r, 'stand');
  const view = present(runView(r));
  assert.equal(view.standOn, 18);
  assert.equal(needsStaging('player', view), true);
  assert.equal(needsStaging('bite', view), true);
  const last = stageSteps(view, null, 0).at(-2).view;
  assert.equal(last.message.length > 0, true);
});

test('the scene keeps the candle count the player last saw until the verdict', () => {
  const run = act(lamiaTable(['10S', '9H', '10D', '7C', '2S']), 'stand');
  const view = present(runView(run));
  const before = { ...view, candlesLit: view.candlesLit + 1 };
  const steps = stageSteps(view, before, 0);
  assert.equal(steps[0].view.candlesLit, before.candlesLit);
  assert.equal(steps.at(-1).view.candlesLit, view.candlesLit);
});
