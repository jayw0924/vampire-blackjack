import { test } from 'node:test';
import assert from 'node:assert/strict';
import { present } from '../src/render.js';
import { createGame, deal, publicView } from '../src/game.js';
import { cards } from './helpers.js';

test('blood label pluralizes and the dealer total stays hidden', () => {
  const view = publicView(deal(createGame({ shoe: cards('10S', '5H', '6D', '3C') })));
  const shown = present(view);
  assert.equal(shown.bloodLabel, '18 drops of blood');
  assert.equal(shown.stakeLabel, 'Stake: 2 drops');
  assert.equal(shown.dealerValueLabel, '');
  assert.equal(shown.dealerCards[1].aria, 'Hole card');
  assert.equal(shown.dealerCards[1].label, '');
  assert.equal(shown.showActions, true);
  assert.equal(shown.showBetting, false);
  assert.equal(shown.room, view.room);
  assert.equal(shown.remark, view.remark);
  assert.equal(JSON.stringify(shown).includes('"rank":"3"'), false);
  assert.equal(JSON.stringify(shown).includes('3♣') || JSON.stringify(shown).includes('"rank":"3"'), false);
});

test('one drop is singular and a settled hand shows the ledger', () => {
  const lone = present({
    blood: 1,
    phase: 'over',
    pendingBet: 2,
    playerHands: [],
    activeHand: 0,
    dealerCards: [],
    lastResult: { hands: [], net: -2 },
    evening: 'drained',
    messageKey: 'drained',
    message: 'The evening ends. You will be a quiet guest in the cellar.',
    actions: ['new_evening'],
    lowBlood: true,
  });
  assert.equal(lone.bloodLabel, '1 drop of blood');
  assert.equal(lone.ledger, '-2 drops');
  assert.equal(lone.showNewEvening, true);
  assert.equal(lone.showNextHand, false);
  assert.equal(lone.showBetting, false);
});
