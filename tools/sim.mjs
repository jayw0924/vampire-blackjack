// Balance simulator. Plays whole runs (or single floors) with bots and reports
// win rates, so the starting numbers in src/tuning.js are chosen, not guessed.
//   node tools/sim.mjs                  full report, default 3000 runs per cell
//   node tools/sim.mjs --runs 800       fewer runs
//   node tools/sim.mjs --json           machine-readable
import { createRun, act, legalRunActions } from '../src/run.js';
import { handValue, isTenValue } from '../src/cards.js';
import { TUNING } from '../src/tuning.js';
import { BOSS_ORDER } from '../src/bosses.js';

const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? dflt : args[i + 1] ?? true;
};
const RUNS = Number(flag('runs', 3000));
const JSON_OUT = args.includes('--json');

function upValue(card) {
  if (card.rank === 'A') return 11;
  return isTenValue(card) ? 10 : Number(card.rank);
}
function soft(cards) {
  let t = 0; let aces = 0;
  for (const c of cards) { t += c.rank === 'A' ? 11 : isTenValue(c) ? 10 : Number(c.rank); if (c.rank === 'A') aces += 1; }
  while (t > 21 && aces > 0) { t -= 10; aces -= 1; }
  return aces > 0;
}

// Textbook basic strategy for this table: dealer stands on all 17s, doubling on any
// first two cards, no double after split, one split.
function basic(cards, up, can) {
  const t = handValue(cards);
  const u = up;
  const dbl = (cond) => (cond && can.includes('double') ? 'double' : null);
  if (cards.length === 2 && cards[0].rank === cards[1].rank || (cards.length === 2 && isTenValue(cards[0]) && isTenValue(cards[1]) && false)) {
    const r = cards[0].rank;
    const v = upValue(cards[0]);
    if (can.includes('split')) {
      if (r === 'A' || r === '8') return 'split';
      if (v === 9 && ![7, 10, 11].includes(u)) return 'split';
      if (v === 7 && u <= 7) return 'split';
      if (v === 6 && u <= 6 && u >= 2) return 'split';
      if ((v === 3 || v === 2) && u >= 4 && u <= 7) return 'split';
    }
  }
  if (soft(cards)) {
    if (t >= 19) return 'stand';
    if (t === 18) return dbl(u >= 3 && u <= 6) || (u >= 9 ? 'hit' : 'stand');
    if (t === 17) return dbl(u >= 3 && u <= 6) || 'hit';
    if (t >= 15) return dbl(u >= 4 && u <= 6) || 'hit';
    return dbl(u >= 5 && u <= 6) || 'hit';
  }
  if (t >= 17) return 'stand';
  if (t >= 13) return u <= 6 ? 'stand' : 'hit';
  if (t === 12) return u >= 4 && u <= 6 ? 'stand' : 'hit';
  if (t === 11) return dbl(u <= 10) || 'hit';
  if (t === 10) return dbl(u <= 9) || 'hit';
  if (t === 9) return dbl(u >= 3 && u <= 6) || 'hit';
  return 'hit';
}

// Someone who has not read the table: stand on 15 or more, never double or split.
function casual(cards, up, can) {
  return handValue(cards) >= 15 ? 'stand' : 'hit';
}

const PREF = ['lantern', 'tithe', 'charons-obol', 'lamias-tooth', 'silver-mirror', 'hecates-key'];

export const BOTS = {
  casual: { name: 'casual', strategy: casual, bet: () => 4, bites: false, info: false, prefer: false },
  basic: { name: 'basic', strategy: basic, bet: () => 4, bites: false, info: false, prefer: true },
  skilledBite: { name: 'skilled+bite', strategy: basic, bet: null, bites: true, info: true, prefer: true },
  skilled: { name: 'skilled', strategy: basic, bet: (run) => {
    const g = run.game; const left = run.handsTotal - run.handsPlayed;
    let b = 4;
    if (g.blood <= 8) b = 2;
    else if (left <= 3 && run.quota - g.blood > 6) b = 8;
    else if (g.blood >= run.quota - 8) b = 6;
    return Math.min(b, Math.floor(g.blood / 2) * 2);
  }, bites: false, info: true, prefer: true },
};

function betFor(bot, run) {
  const g = run.game;
  if (typeof bot.bet === 'function') return bot.bet(run);
  // bold: stake what the quota still asks for, in whole drops, 2..10. Careful
  // when low (never more than half of what is left), bolder with a lead.
  const left = Math.max(1, run.handsTotal - run.handsPlayed);
  const ask = run.quota - g.blood;
  let b = Math.round((ask / Math.min(left, 3)) / 2) * 2;
  b = Math.max(2, Math.min(10, b, Math.floor(g.blood / 2)));
  if (g.blood <= 6) b = 2;
  return b % 2 ? b - 1 : b;
}

function decide(bot, run) {
  const g = run.game;
  const can = legalRunActions(run);
  const hand = g.playerHands[g.activeHand];
  const up = upValue(g.dealerCards[0]);
  let u = up;
  const known = bot.info && (g.rules.holeUp || g.peeked);
  if (bot.info && can.includes('peek') && handValue(hand.cards) >= 12 && handValue(hand.cards) <= 16) return 'peek';
  let move;
  if (known) {
    const dealer = handValue(g.dealerCards);
    // the dealer's total is known: stand once ahead of where he will finish
    const finish = dealer >= g.rules.dealerStandOn ? dealer : null;
    const mine = handValue(hand.cards);
    if (finish !== null) {
      if (mine > finish) move = 'stand';
      else if (mine >= 17 && mine === finish) move = 'stand';
      else move = mine < 17 || mine <= finish ? 'hit' : 'stand';
      if (mine < finish && mine >= 17 && finish >= 20) move = 'hit';
      if (mine === finish && mine < 17) move = 'hit';
    } else {
      move = mine >= 12 ? 'stand' : basic(hand.cards, 6, can);
      if (mine >= 12 && dealer < 12) move = 'stand';
    }
    if (move === 'hit' && !can.includes('hit')) move = 'stand';
    if (can.includes('double') && hand.cards.length === 2 && mine >= 9 && mine <= 11 && (finish === null || mine + 10 > finish)) move = 'double';
  } else {
    move = bot.strategy(hand.cards, u, can);
  }
  if (bot.bites && can.includes('bite') && g.blood >= 10 && move === 'hit' && handValue(hand.cards) >= 12 && !soft(hand.cards)) return 'bite';
  if (!can.includes(move)) move = can.includes('stand') ? 'stand' : 'hit';
  return move;
}

function choose(bot, run, seedSalt) {
  if (!bot.prefer) return run.choices[(run.seed + seedSalt) % run.choices.length];
  for (const id of PREF) if (run.choices.includes(id)) return id;
  return run.choices[0];
}

BOTS.skilledBite.bet = BOTS.skilled.bet;

export function playRun(bot, seed, { floor = 1, blood = null, relics = null, tuning = TUNING } = {}) {
  let run = createRun({ seed, floor, blood, relics, tuning });
  const result = { floors: [], end: null, reached: floor };
  let guard = 0;
  while (guard++ < 5000) {
    if (run.status === 'pick') { run = act(run, 'pick', choose(bot, run, run.floor)); continue; }
    if (['dawn', 'drained', 'won', 'withdrew'].includes(run.status)) break;
    const g = run.game;
    const can = legalRunActions(run);
    if (g.phase === 'betting') {
      const want = betFor(bot, run);
      if (g.pendingBet < want && can.includes('bet_up')) { run = act(run, 'bet_up'); continue; }
      if (g.pendingBet > want && can.includes('bet_down')) { run = act(run, 'bet_down'); continue; }
      if (!can.includes('deal')) { run = act(run, can.includes('bet_down') ? 'bet_down' : 'withdraw'); continue; }
      run = act(run, 'deal');
    } else if (g.phase === 'settled') {
      run = act(run, 'next_hand');
    } else if (g.phase === 'bite') {
      const hand = g.playerHands[g.activeHand];
      const t = handValue(hand.cards.concat(g.pendingBite.card));
      run = act(run, t <= 21 && t >= handValue(hand.cards) + 2 && t >= 14 ? 'keep' : 'burn');
    } else {
      run = act(run, decide(bot, run));
    }
    result.reached = Math.max(result.reached, run.floor);
  }
  result.end = run.status;
  result.floor = run.floor;
  result.hands = run.log.length;
  return result;
}

function rate(n, d) { return d ? Math.round((1000 * n) / d) / 10 : 0; }

export function report(tuning = TUNING, runs = RUNS) {
  const out = { runs, bots: {} };
  for (const bot of [BOTS.casual, BOTS.basic, BOTS.skilled]) {
    const entry = { isolated: {}, full: {} };
    // each floor on its own, no relics, arriving with typical blood
    let arrive = tuning.startBlood;
    BOSS_ORDER.forEach((id, i) => {
      let won = 0; let dawn = 0; let drained = 0;
      for (let s = 1; s <= runs; s += 1) {
        const r = playRun(bot, s * 7 + i, { floor: i + 1, blood: arrive, relics: [], tuning });
        if (r.floor > i + 1 || r.end === 'won') won += 1;
        else if (r.end === 'dawn') dawn += 1;
        else if (r.end === 'drained') drained += 1;
      }
      entry.isolated[id] = { arrive, clear: rate(won, runs), dawn: rate(dawn, runs), drained: rate(drained, runs) };
      arrive = tuning.floors[id].quota + 2 + (tuning.floors[BOSS_ORDER[i + 1]]?.bonus ?? 0);
    });
    // whole runs, with relics picked as the bot would
    const reached = [0, 0, 0, 0];
    let won = 0;
    for (let s = 1; s <= runs; s += 1) {
      const r = playRun(bot, s * 13 + 1, { tuning });
      reached[Math.min(3, r.reached)] += 1;
      if (r.end === 'won') won += 1;
    }
    const f1 = runs; const f2 = reached[2] + reached[3]; const f3 = reached[3];
    entry.full = {
      escapeRate: rate(won, runs),
      clearF1: rate(f2, f1),
      clearF2GivenReached: rate(f3, f2),
      clearF3GivenReached: rate(won, f3),
      reachedF2: rate(f2, runs),
      reachedF3: rate(f3, runs),
    };
    out.bots[bot.name] = entry;
  }
  // Bite: what does it do to a skilled player's whole run at each price?
  out.bite = {};
  for (const cost of [1, 2, 3]) {
    const t = { ...tuning, bite: { cost } };
    const row = {};
    for (const bot of [BOTS.skilled, BOTS.skilledBite]) {
      let won = 0;
      for (let s = 1; s <= runs; s += 1) if (playRun(bot, s * 13 + 1, { tuning: t }).end === 'won') won += 1;
      row[bot.name] = rate(won, runs);
    }
    out.bite[cost] = row;
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = report();
  if (JSON_OUT) console.log(JSON.stringify({ tuning: TUNING, ...out }, null, 1));
  else {
    console.log(`Vigil balance sim, ${out.runs} runs per cell`);
    console.log(JSON.stringify(TUNING.floors));
    for (const [name, e] of Object.entries(out.bots)) {
      console.log(`\n${name}`);
      for (const [id, f] of Object.entries(e.isolated)) {
        console.log(`  ${id.padEnd(8)} arrive ${String(f.arrive).padStart(2)}  clear ${String(f.clear).padStart(5)}%  dawn ${String(f.dawn).padStart(5)}%  drained ${String(f.drained).padStart(5)}%`);
      }
      const f = e.full;
      console.log(`  full run: reach F2 ${f.reachedF2}%, F3 ${f.reachedF3}%, escape ${f.escapeRate}%  (floor win | reached: ${f.clearF1} / ${f.clearF2GivenReached} / ${f.clearF3GivenReached})`);
    }
    console.log('\nBite price vs whole-run escape rate (skilled bot):');
    for (const [cost, row] of Object.entries(out.bite)) console.log(`  cost ${cost}: without Bite ${row.skilled}%  with Bite ${row['skilled+bite']}%`);
  }
}
