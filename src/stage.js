// Pure staging for the dealer's turn. The game core settles a hand in one step;
// the page replays it as a short scene. Nothing here reads a hidden card: it
// only slices what the settled view already shows.
export const TIMING = {
  deal: 150, // gap between cards leaving the shoe
  dealIn: 280, // one card's travel
  beat: 650, // the dealer looks at you before turning his card
  flip: 460, // hole card turns over
  draw: 520, // each extra dealer card
  settle: 480, // pause before the verdict
};

export const STAGE_LINES = {
  turn: 'He turns his card.',
  draw: 'He draws.',
  hold: 'He holds.',
  bust: 'He reaches too far.',
  idle: 'He need not draw.',
};

export function needsStaging(prevPhase, view) {
  if (view.phase !== 'settled' && view.phase !== 'over') return false;
  if (prevPhase !== 'betting' && prevPhase !== 'player') return false;
  return view.dealerCards.length >= 2 && !view.dealerCards.some((c) => c.hidden);
}

function hiddenHole() {
  return { hidden: true, label: '', red: false, aria: 'Hole card' };
}

function totalLabel(view, count) {
  if (count < 2) return '';
  const total = view.dealerTotals[count - 1];
  return total === undefined ? '' : String(total);
}

// Everything the table shows before the verdict: the player's cards as they
// are, the dealer's up card and a face-down hole card, the old room, no result.
export function interimView(view, before) {
  const keep = ['room', 'roomLine', 'candleCount', 'cue', 'lowBlood'];
  const atmosphere = {};
  if (before) for (const key of keep) atmosphere[key] = before[key];
  return {
    ...view,
    ...atmosphere,
    dealerCards: [view.dealerCards[0], hiddenHole()],
    dealerValueLabel: '',
    dealerTotals: [],
    message: STAGE_LINES.turn,
    remark: '',
    story: '',
    ledger: '',
    stamp: '',
    showBetting: false,
    showActions: false,
    showNextHand: false,
    showNewEvening: false,
    enabled: [],
    playerHands: view.playerHands.map((hand) => ({ ...hand, active: false, outcomeLabel: '' })),
  };
}

function lineAfter(view, n) {
  if (view.dealerTotals[n - 1] > 21) return STAGE_LINES.bust;
  if (n < view.dealerCards.length) return STAGE_LINES.draw;
  return view.dealerTotals[n - 1] < 17 ? STAGE_LINES.idle : STAGE_LINES.hold;
}

function shown(view, before, count, message) {
  return {
    ...interimView(view, before),
    dealerCards: view.dealerCards.slice(0, count),
    dealerValueLabel: totalLabel(view, count),
    message,
  };
}

// A list of { at, view } steps (ms from the start of the scene) ending with the
// untouched settled view. `before` is the last view the player saw; `dealt` is
// how many cards are still travelling in from the shoe at time zero.
export function stageSteps(view, before, dealt = 0) {
  const t = TIMING;
  const count = view.dealerCards.length;
  const steps = [{ at: 0, view: interimView(view, before) }];
  let at = (dealt > 0 ? dealt * t.deal + t.dealIn : 0) + t.beat;
  steps.push({ at, view: shown(view, before, 2, count > 2 ? STAGE_LINES.draw : lineAfter(view, 2)) });
  at += t.flip;
  for (let n = 3; n <= count; n += 1) {
    steps.push({ at, view: shown(view, before, n, lineAfter(view, n)) });
    at += t.draw;
  }
  steps.push({ at: at - (count > 2 ? t.draw : 0) + t.settle, view });
  return steps;
}
