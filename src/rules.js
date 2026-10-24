import { handValue, isBlackjack, isTenValue } from './cards.js';

export const RULES = {
  startingBlood: 20,
  minBet: 2,
  maxBet: 10,
  satedAt: 40,
  lowBlood: 6,
  reshuffleBelow: 20,
};

export function stakeReturned(outcome, bet) {
  if (outcome === 'loss') return 0;
  if (outcome === 'push') return bet;
  if (outcome === 'win') return bet * 2;
  if (outcome === 'blackjack') return (bet * 5) / 2;
  throw new Error('unknown outcome');
}

export function canSplitCards(c1, c2) {
  if (isTenValue(c1) && isTenValue(c2)) return true;
  return c1.rank === c2.rank;
}

export function outcomeFor(playerCards, dealerCards, naturalAllowed) {
  if (handValue(playerCards) > 21) return 'loss';
  if (naturalAllowed && isBlackjack(playerCards) && !isBlackjack(dealerCards)) {
    return 'blackjack';
  }
  if (handValue(dealerCards) > 21) return 'win';
  const player = handValue(playerCards);
  const dealer = handValue(dealerCards);
  if (player > dealer) return 'win';
  if (player < dealer) return 'loss';
  return 'push';
}
