import { handValue } from './cards.js';

const RANK_NAME = { A: 'Ace', K: 'King', Q: 'Queen', J: 'Jack' };
const SUIT_NAME = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' };
const SUIT_GLYPH = { S: '♠', H: '♥', D: '♦', C: '♣' };

export function displayCard(c) {
  if (c.hidden) return { hidden: true, label: '', red: false, aria: 'Hole card' };
  const rankName = RANK_NAME[c.rank] || c.rank;
  return {
    hidden: false,
    rank: c.rank,
    label: `${c.rank}${SUIT_GLYPH[c.suit]}`,
    suitGlyph: SUIT_GLYPH[c.suit],
    red: c.suit === 'H' || c.suit === 'D',
    aria: `${rankName} of ${SUIT_NAME[c.suit]}`,
  };
}

export function candleCount(room) {
  if (room === 'cellar') return 0;
  if (room === 'close' || room === 'dismissal') return 1;
  if (room === 'hungry' || room === 'departure') return 2;
  return 3;
}

// One entry per hand the floor gives: 'lit' while hands remain, 'stub' once burned.
// A burned candle never leaves the row; it stays as a stub.
export function candleStates(total, lit) {
  const n = Math.max(0, Math.floor(total) || 0);
  const on = Math.max(0, Math.min(n, Math.floor(lit) || 0));
  return Array.from({ length: n }, (_, i) => (i < on ? 'lit' : 'stub'));
}

export function stakeDrops(bet) {
  return Math.max(0, Math.floor(Number(bet) / 2) || 0);
}

// Ten ticks. The vial is scaled to the floor's quota, so a full vial is a cleared floor.
export function vialFilled(blood, quota = 40) {
  if (!blood || blood <= 0) return 0;
  return Math.min(10, Math.ceil((blood * 10) / quota));
}

function dealerValueLabel(view) {
  if (view.dealerCards.some((c) => c.hidden)) return '';
  if (view.dealerCards.length < 2) return '';
  return String(handValue(view.dealerCards));
}

function outcomeLabel(hand, busted) {
  if (!hand) return '';
  if (busted) return 'Bust';
  if (hand.tie) return 'Tie, house wins';
  if (hand.outcome === 'blackjack') return 'Blackjack';
  if (hand.outcome === 'win') return 'Wins';
  if (hand.outcome === 'loss') return 'Loses';
  return 'Push';
}

export function ledgerLabel(net) {
  if (net > 0) return `+${net} drops`;
  if (net < 0) return `${net} drops`;
  return 'no blood exchanged';
}

export function bloodLabel(blood) {
  return blood === 1 ? '1 drop of blood' : `${blood} drops of blood`;
}

// Running dealer totals, one per prefix of the dealer's cards. Empty while the
// hole card is hidden, so a total for a card the page may not show never exists.
function dealerTotals(view) {
  if (view.dealerCards.some((c) => c.hidden)) return [];
  return view.dealerCards.map((_, i) => handValue(view.dealerCards.slice(0, i + 1)));
}

function stampFor(messageKey) {
  if (messageKey === 'player_bust') return 'Bust';
  if (messageKey === 'player_blackjack') return 'Blackjack';
  return '';
}

export function dawnLabel(handsLeft) {
  if (handsLeft <= 0) return 'Dawn';
  if (handsLeft === 1) return 'Last hand before dawn';
  return `${handsLeft} hands until dawn`;
}

// Pieces that exist only inside a run (see runView in run.js).
function runFields(view) {
  const run = view.run;
  if (!run) return {};
  return {
    floorName: run.boss.floorName,
    plateName: run.boss.plate,
    ruleText: run.boss.ruleText,
    bossId: run.boss.id,
    mood: run.mood,
    dawnLine: dawnLabel(run.handsLeft),
    candlesTotal: run.handsTotal,
    candlesLit: run.candlesLit,
    quota: run.quota,
    quotaLabel: `Quota ${run.quota}`,
    vialFilled: vialFilled(view.blood, run.quota),
    relics: run.relics,
    choices: run.choices,
    pick: run.status === 'pick',
    pickFor: run.pickFor,
    floor: run.floor,
    reached: run.reached,
    status: run.status,
  };
}

export function present(view) {
  return {
    message: view.message,
    blood: view.blood,
    bloodLabel: bloodLabel(view.blood),
    phase: view.phase,
    stamp: view.lastResult ? stampFor(view.messageKey) : '',
    dealerTotals: dealerTotals(view),
    stakeLabel: `Stake: ${view.pendingBet} drops`,
    lowBlood: view.lowBlood,
    showBetting: view.phase === 'betting',
    showActions: view.phase === 'player',
    showBite: view.phase === 'bite',
    showNextHand: view.phase === 'settled',
    showNewEvening: view.phase === 'over',
    enabled: view.actions.slice(),
    dealerCards: view.dealerCards.map(displayCard),
    dealerValueLabel: dealerValueLabel(view),
    holeKnown: Boolean(view.holeKnown),
    standOn: view.rules ? view.rules.dealerStandOn : 17,
    hitCost: view.rules ? view.rules.hitCost : 0,
    biteCost: view.rules ? view.rules.biteCost : 2,
    biteCard: view.pendingBite ? displayCard(view.pendingBite) : null,
    burned: (view.burned || []).map(displayCard),
    playerHands: view.playerHands.map((hand, index) => ({
      cards: hand.cards.map(displayCard),
      valueLabel: String(handValue(hand.cards)),
      active: view.phase === 'player' && index === view.activeHand,
      outcomeLabel: view.lastResult ? outcomeLabel(view.lastResult.hands[index], hand.busted) : '',
    })),
    ledger: view.ledger !== undefined ? view.ledger : view.lastResult ? ledgerLabel(view.lastResult.net) : '',
    ledgerItems: view.ledgerItems || [],
    room: view.room,
    roomLine: view.roomLine || '',
    cue: view.cue,
    remark: view.remark || '',
    story: view.story || '',
    stakeDrops: stakeDrops(view.pendingBet),
    vialFilled: vialFilled(view.blood),
    candleCount: candleCount(view.room),
    ...runFields(view),
  };
}
