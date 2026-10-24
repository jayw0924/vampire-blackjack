import { handValue } from './cards.js';

const RANK_NAME = { A: 'Ace', K: 'King', Q: 'Queen', J: 'Jack' };
const SUIT_NAME = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' };
const SUIT_GLYPH = { S: '♠', H: '♥', D: '♦', C: '♣' };

export function displayCard(c) {
  if (c.hidden) return { hidden: true, label: '', red: false, aria: 'Hole card' };
  const rankName = RANK_NAME[c.rank] || c.rank;
  return {
    hidden: false,
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

export function stakeDrops(bet) {
  return Math.max(0, Math.floor(Number(bet) / 2) || 0);
}

export function vialFilled(blood) {
  if (!blood || blood <= 0) return 0;
  return Math.min(10, Math.ceil(blood / 4));
}

function dealerValueLabel(view) {
  if (view.dealerCards.some((c) => c.hidden)) return '';
  if (view.dealerCards.length < 2) return '';
  return String(handValue(view.dealerCards));
}

function outcomeLabel(hand) {
  if (!hand) return '';
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

export function present(view) {
  return {
    message: view.message,
    bloodLabel: view.blood === 1 ? '1 drop of blood' : `${view.blood} drops of blood`,
    stakeLabel: `Stake: ${view.pendingBet} drops`,
    lowBlood: view.lowBlood,
    showBetting: view.phase === 'betting',
    showActions: view.phase === 'player',
    showNextHand: view.phase === 'settled',
    showNewEvening: view.phase === 'over',
    enabled: view.actions.slice(),
    dealerCards: view.dealerCards.map(displayCard),
    dealerValueLabel: dealerValueLabel(view),
    playerHands: view.playerHands.map((hand, index) => ({
      cards: hand.cards.map(displayCard),
      valueLabel: String(handValue(hand.cards)),
      active: view.phase === 'player' && index === view.activeHand,
      outcomeLabel: view.lastResult ? outcomeLabel(view.lastResult.hands[index]) : '',
    })),
    ledger: view.lastResult ? ledgerLabel(view.lastResult.net) : '',
    room: view.room,
    roomLine: view.roomLine || '',
    cue: view.cue,
    remark: view.remark || '',
    story: view.story || '',
    stakeDrops: stakeDrops(view.pendingBet),
    vialFilled: vialFilled(view.blood),
    candleCount: candleCount(view.room),
  };
}
