import { handValue, isTenValue } from './cards.js';

const ROOMS = {
  composed: 'The candles are steady.',
  hungry: 'The parlor has drawn in.',
  close: 'You can hear your own pulse.',
  flushed: 'The Lord watches the cup, not the cards.',
  cellar: 'The stairs down are already lit.',
  dismissal: 'The door is open. It will not stay that way.',
  departure: 'The door remembers the way you came.',
};

const TONES = {
  idle: { freq: 73, gain: 0.015 },
  hand: { freq: 82, gain: 0.02 },
  pulse: { freq: 55, gain: 0.028 },
  drink: { freq: 49, gain: 0.024 },
  pay: { freq: 98, gain: 0.018 },
  amused: { freq: 110, gain: 0.016 },
  cellar: { freq: 41, gain: 0.036 },
  dismissal: { freq: 87, gain: 0.012 },
  departure: { freq: 65, gain: 0.01 },
};

export function roomFor(blood, evening) {
  if (evening === 'drained') return 'cellar';
  if (evening === 'sated') return 'dismissal';
  if (evening === 'withdrew') return 'departure';
  if (blood <= 6) return 'close';
  if (blood <= 12) return 'hungry';
  if (blood >= 32) return 'flushed';
  return 'composed';
}

export function roomLine(room) {
  const line = ROOMS[room];
  if (!line) throw new Error(`unknown room: ${room}`);
  return line;
}

export function toneFor(cue) {
  return TONES[cue] || TONES.idle;
}

export function cueFor({ phase, evening, room, messageKey }) {
  if (evening === 'drained' || room === 'cellar') return 'cellar';
  if (evening === 'sated') return 'dismissal';
  if (evening === 'withdrew') return 'departure';
  if (room === 'close') return 'pulse';
  if (messageKey === 'player_bust' || messageKey === 'player_loss' || messageKey === 'dealer_blackjack') return 'drink';
  if (messageKey === 'player_win' || messageKey === 'player_blackjack' || messageKey === 'dealer_bust') return 'pay';
  if (phase === 'player') return 'hand';
  if (room === 'flushed') return 'amused';
  return 'idle';
}

export function remarkFor(game) {
  if (game.phase !== 'player' || !game.playerHands[game.activeHand]) return '';
  const up = game.dealerCards[0];
  const total = handValue(game.playerHands[game.activeHand].cards);
  if (up && (up.rank === 'A' || isTenValue(up))) return 'He shows a high card, and does not blink.';
  if (total >= 12 && total <= 16) return 'A poor hand. The greedy ones hit.';
  if (total >= 17) return 'You could stand. The patient ones do.';
  return '';
}

export function storyFor(game) {
  if (game.evening === 'drained') return 'They will not use your name downstairs.';
  if (game.evening === 'sated') return 'He does not stand to see you out.';
  if (game.evening === 'withdrew') return 'The coat was still warm.';
  if (game.freshHeart) return 'The portraits have stopped pretending to be paint.';
  if (game.phase === 'betting' && !game.beats?.arrived) {
    return 'A servant took your coat. No one offered to bring it back.';
  }
  return '';
}
