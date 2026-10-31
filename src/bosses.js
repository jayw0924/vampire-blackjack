// Three dealers. Each is data: who he is, the one rule he changes at the table
// (the core enforces it), and his lines. Lines are keyed by what just happened.
// Dry, short, noir. A line is picked by the run's seed and hand count, never at random.

export const BOSS_ORDER = ['steward', 'lamia', 'vesper'];

// Keys every boss must have (tests check this).
export const LINE_KEYS = [
  'intro', 'betting', 'player_turn', 'player_blackjack', 'dealer_blackjack', 'push',
  'player_win', 'player_loss', 'player_bust', 'dealer_bust', 'low_blood', 'bite',
  'burned', 'peeked', 'withdrew', 'cleared', 'dawn', 'drained', 'won',
  'tell_high', 'tell_poor', 'tell_good',
  // memory: what he remembers about you
  'loss_streak', 'win_streak', 'double_lost', 'double_won', 'bust_low', 'bite_habit', 'mirror',
];

export const BOSSES = {
  steward: {
    id: 'steward',
    name: 'The Steward',
    plate: 'The Steward',
    floorName: 'Floor I · The Steward',
    portrait: 'steward',
    ruleText: '',
    core: {},
    lines: {
      intro: ['Your coat is taken. Sit. The house keeps an easy table on its first night.'],
      betting: ['Place your stake. Two drops, or ten.', 'Whenever you are ready. The house is patient.'],
      player_turn: ['The hand is yours.', 'Take your time. The candles will not.'],
      player_blackjack: ['A natural. The house is obliged to pay, and does not enjoy it.'],
      dealer_blackjack: ['I am sorry. No, I am not.'],
      push: ['A tie. The house returns what is yours.'],
      player_win: ['The house pays. It always pays, in the end.', 'Well played. Do not look pleased; it is rude.'],
      player_loss: ['The house collects.', 'Noted, and entered in the ledger.'],
      player_bust: ['Over twenty-one. The house is terribly sorry.', 'You reached too far. It happens to guests.'],
      dealer_bust: ['I have overreached. It is not in my nature.'],
      low_blood: ['You look pale. The house suggests you sit very still.'],
      bite: ['Keep it, or burn it. The house does not advise.'],
      burned: ['Burned. The house will clear the ash.'],
      peeked: ['You looked. The house pretends not to have noticed.'],
      withdrew: ['You leave early. The door is that way. It was always that way.'],
      cleared: ['The stair is open. Go down, if you must.'],
      dawn: ['Dawn. The candles are out, and so are you.'],
      drained: ['The cup is empty. Someone will see you down.'],
      won: ['Sunrise. You have no business being alive for it.'],
      tell_high: ['He shows a high card, and does not blink.'],
      tell_poor: ['A poor hand. The greedy ones hit.'],
      tell_good: ['You could stand. The patient ones do.'],
      loss_streak: ['Three in a row. The house hates to see a guest so unlucky, and watches closely.'],
      win_streak: ['Three in a row. The house begins to take it personally.'],
      double_lost: ['You doubled, and the house thanks you for it.'],
      double_won: ['A bold double. The house will remember it, unkindly.'],
      bust_low: ['Over, and with so little left. The house is almost moved.'],
      bite_habit: ['You are fond of the Bite. Most guests are, by the third floor.'],
      mirror: ['The mirror, so soon. The house pretends not to have noticed.'],
    },
  },

  lamia: {
    id: 'lamia',
    name: 'The Lamia',
    plate: 'The Lamia',
    floorName: 'Floor II · The Lamia',
    portrait: 'lamia',
    ruleText: 'Her cards lie face up. Each Hit costs 1 blood.',
    core: { holeUp: true, hitCost: 1 },
    lines: {
      intro: ['Look as much as you like, darling. I hide nothing. I only charge.'],
      betting: ['Come closer, and stake something warm.', 'Two drops, or ten. I am not choosy. I am thorough.'],
      player_turn: ['You can see both of mine. Be brave.', 'Every Hit is a little sip. Mine.'],
      player_blackjack: ['Oh, beautiful. Take it, and take your time leaving.'],
      dealer_blackjack: ['Twenty-one, darling. I did show you.'],
      push: ['Even. How tedious. How tender.'],
      player_win: ['You win. Keep it warm for me.', 'Clever thing. It will not last.'],
      player_loss: ['Mine, then. Thank you.', 'Delicious. Another?'],
      player_bust: ['Over. Such a lovely way to give.', 'You pay for every card, and then you pay for the last one.'],
      dealer_bust: ['I over-reached. I do that when I am hungry.'],
      low_blood: ['I can smell how little is left. Do not worry. I will make it quick.'],
      bite: ['Keep it, or burn it. I will watch either way.'],
      burned: ['Burned. What a waste of something so fresh.'],
      peeked: ['Mirror? I have none. I have you.'],
      withdrew: ['Leaving? The stairs are cold, darling.'],
      cleared: ['Down you go. He is waiting, and he is not as kind.'],
      dawn: ['Dawn. I never could keep a guest past dawn.'],
      drained: ['Empty. And I was just getting to like you.'],
      won: ['Sunrise. Even I will miss you.'],
      tell_high: ['Her up-card is cold and high. She waits.'],
      tell_poor: ['A poor hand, and every Hit is a sip.'],
      tell_good: ['You could stand, darling. It costs nothing.'],
      loss_streak: ['Three losses. Poor thing. Do tell me when to stop.'],
      win_streak: ['Three wins. You are making me hungry, and impatient.'],
      double_lost: ['Doubled, and gone. You do give so generously.'],
      double_won: ['A lucky double. I will remember it.'],
      bust_low: ['Over, with almost nothing left. I almost felt that.'],
      bite_habit: ['You Bite so often. I begin to think we are alike.'],
      mirror: ['A little mirror. And what did you see, darling?'],
    },
  },

  vesper: {
    id: 'vesper',
    name: 'Lord Vesper',
    plate: 'Lord Vesper',
    floorName: 'Floor III · Lord Vesper',
    portrait: 'vesper',
    ruleText: 'He stands on 18.',
    core: { dealerStandOn: 18 },
    lines: {
      intro: ['Good evening. I have been listening to your heart since the stairs.'],
      betting: ['Place your blood on the felt. Two drops, or ten.', 'I can wait. I have had a great deal of practice.'],
      player_turn: ['The hand is yours. For the moment.', 'Decide. I can hear you deciding.'],
      player_blackjack: ['A natural. Drink. You have earned a mouthful of me.'],
      dealer_blackjack: ['I was already finished.'],
      push: ['We are matched. Your blood stays where it is.'],
      player_win: ['The house pays. Do not grow fond of the taste.', 'You win. I find I am not angry. That should worry you.'],
      player_loss: ['I drink. Sit still.', 'Mine. I did warn the others.'],
      player_bust: ['Too greedy. The hand is mine.', 'Over. I could hear it coming.'],
      dealer_bust: ['I overreached. Take what you won.'],
      low_blood: ['I can hear your heart. It is counting for me.'],
      bite: ['Keep it, or burn it. Either way, I will know.'],
      burned: ['Burned. Cautious. I think better of you for it.'],
      peeked: ['You looked at my card. Everyone does, eventually.'],
      withdrew: ['You stand. Few do. Go.'],
      cleared: ['The door is open. It will not stay that way.'],
      dawn: ['Dawn. I am afraid you have stayed too long.'],
      drained: ['The evening ends. You will be a quiet guest in the cellar.'],
      won: ['Enough. Leave while I am still amused. The door is open, and the sun is on the other side of it.'],
      tell_high: ['He shows a high card, and does not blink.'],
      tell_poor: ['A poor hand. The greedy ones hit.'],
      tell_good: ['You could stand. The patient ones do.'],
      loss_streak: ['Third loss in a row. I could hear that one coming, from your pulse.'],
      win_streak: ['Three wins. You have a rhythm. I will learn it.'],
      double_lost: ['You doubled. I watched your hands. They were steady. They should not have been.'],
      double_won: ['A double, and it held. Do it again. Please.'],
      bust_low: ['Over, with so little left. I heard it before you did.'],
      bite_habit: ['You Bite often. I recognise the appetite.'],
      mirror: ['The mirror. I have not seen one of those in some time. It does not show me, you know.'],
    },
  },
};

export function bossFor(floor) {
  return BOSSES[BOSS_ORDER[floor - 1]];
}

// Pick a line deterministically from a key's pool.
export function pickLine(boss, key, salt) {
  const pool = boss.lines[key];
  if (!pool || pool.length === 0) throw new Error(`no line for ${key}`);
  return pool[Math.abs(salt) % pool.length];
}

// What he remembers, read from the run's event log (see run.js for the entry shape).
export function memoryKey(log) {
  const last = log[log.length - 1];
  if (!last) return null;
  if (last.result === 'bust' && last.bloodAfter <= 8) return 'bust_low';
  if (last.doubled && last.net < 0) return 'double_lost';
  if (last.doubled && last.net > 0) return 'double_won';
  const tail = (test) => {
    let n = 0;
    for (let i = log.length - 1; i >= 0 && test(log[i]); i -= 1) n += 1;
    return n;
  };
  const lost = (e) => e.result === 'loss' || e.result === 'bust';
  if (last.net < 0 && tail(lost) >= 3) return 'loss_streak';
  if (last.net > 0 && tail((e) => e.net > 0) >= 3) return 'win_streak';
  if (last.peeked) return 'mirror';
  const recent = log.slice(-4);
  if (last.bites > 0 && recent.filter((e) => e.bites > 0).length >= 3) return 'bite_habit';
  return null;
}
