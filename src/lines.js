export const LINES = {
  betting: 'Place your blood on the felt. Two drops, or ten.',
  player_turn: 'The hand is yours.',
  player_blackjack: 'A natural. Drink. You have earned a mouthful of me.',
  dealer_blackjack: 'I was already finished.',
  push: 'We are matched. Your blood stays where it is.',
  player_win: 'The house pays. Do not grow fond of the taste.',
  player_loss: 'I drink. Sit still.',
  player_bust: 'Too greedy. The hand is mine.',
  dealer_bust: 'I overreached. Take what you won.',
  low_blood: 'I can hear your heart. It is counting for me.',
  drained: 'The evening ends. You will be a quiet guest in the cellar.',
  sated: 'Enough. Leave while I am still amused.',
  withdrew: 'You stand. Few do. Go.',
  tie_house: 'A tie. The house keeps it.',
  bite: 'Keep it, or burn it.',
  burned: 'Burned. It will not come back to you.',
  peeked: 'You look. He lets you.',
};

export function lineFor(key) {
  const line = LINES[key];
  if (!line) throw new Error(`unknown line: ${key}`);
  return line;
}
