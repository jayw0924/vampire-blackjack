import * as core from './game.js';
import { handValue, isTenValue } from './cards.js';
import { BOSS_ORDER, BOSSES, memoryKey, pickLine } from './bosses.js';
import { RELICS, choicesFor, relicsView, runHook } from './relics.js';
import { TUNING } from './tuning.js';

// A run wraps the seeded blackjack core. It owns floors, the dawn clock, the
// hunger tax, relics and the event log. It never changes how a hand is played:
// table rules that alter the dealer (stands on 18, face-up cards, a Hit that
// costs blood, Bite) are core rules, so the page replays exactly what the core did.

const TERMINAL = ['dawn', 'drained', 'withdrew', 'won'];
export const FLOORS = BOSS_ORDER.length;

function floorSeed(seed, floor) {
  return (Math.imul(seed >>> 0, 2654435761) + floor * 97) >>> 0;
}

function emptyHand() {
  return { doubled: false, bites: 0, burned: 0, split: false, peeked: false };
}

function coreRules(run, bossId, startBlood) {
  const rules = {
    ...BOSSES[bossId].core,
    ...(run.tuning.floors[bossId].rules || {}),
    autoEnd: false,
    satedAt: null,
    biteEnabled: true,
    biteCost: run.tuning.bite.cost,
    burnRefund: run.tuning.bite.refund ?? 0,
    startBlood,
  };
  for (const patch of runHook(run, 'onRules')) Object.assign(rules, patch.rules ?? patch);
  return rules;
}

function setupFloor(run, floor, blood) {
  const bossId = BOSS_ORDER[floor - 1];
  const cfg = run.tuning.floors[bossId];
  const fresh = { ...run, floor, bossId, flags: {}, handsPlayed: 0, handFlags: emptyHand() };
  let hands = cfg.hands;
  for (const patch of runHook(fresh, 'onFloorStart')) hands += patch.hands ?? 0;
  return {
    ...fresh,
    handsTotal: hands,
    quota: cfg.quota,
    tax: cfg.tax,
    taxEvery: cfg.taxEvery ?? 1,
    lastSettle: null,
    lastMemory: null,
    game: core.createGame({ seed: floorSeed(run.seed, floor), rules: coreRules(fresh, bossId, blood) }),
  };
}

export function createRun({ seed = 1, tuning = TUNING, relics = null, floor = 1, blood = null } = {}) {
  const base = {
    seed: seed >>> 0,
    tuning,
    relics: relics ? relics.slice() : [],
    status: 'playing',
    pickFor: null,
    choices: [],
    log: [],
    floorsCleared: 0,
    reached: floor,
  };
  const run = setupFloor(base, floor, blood ?? tuning.startBlood);
  if (relics) return run;
  return { ...run, status: 'pick', pickFor: 'start', choices: choicesFor(run.seed, 0, []) };
}

export function isTerminal(run) {
  return TERMINAL.includes(run.status);
}

export function legalRunActions(run) {
  if (run.status === 'pick') return ['pick'];
  if (isTerminal(run)) return ['new_evening'];
  return core.legalActions(run.game);
}

function settleHand(run) {
  const game = run.game;
  const items = [];
  let blood = game.blood;
  const results = game.lastResult.hands;
  results.forEach((result, i) => {
    const ctx = { result, hand: game.playerHands[i] };
    const names = [];
    if (result.outcome === 'win' || result.outcome === 'blackjack') names.push('onWin');
    if (result.outcome === 'loss') names.push('onLoss');
    if (game.playerHands[i].busted) names.push('onBust');
    for (const name of names) {
      let patchFlags = {};
      for (const patch of runHook({ ...run, flags: { ...run.flags, ...patchFlags } }, name, ctx)) {
        blood += patch.blood ?? 0;
        if (patch.note) items.push({ label: patch.note, delta: patch.blood ?? 0 });
        patchFlags = { ...patchFlags, ...patch.flags };
      }
      run = { ...run, flags: { ...run.flags, ...patchFlags } };
    }
  });
  const taxed = run.tax > 0 && (run.handsPlayed + 1) % run.taxEvery === 0;
  if (taxed) {
    blood -= run.tax;
    items.push({ label: `Hunger −${run.tax}`, delta: -run.tax });
  }
  blood = Math.max(0, blood);

  const net = game.lastResult.net;
  const allBusted = game.playerHands.every((h) => h.busted);
  const result = allBusted
    ? 'bust'
    : game.lastResult.hands.some((h) => h.outcome === 'blackjack')
      ? 'blackjack'
      : net > 0 ? 'win' : net < 0 ? 'loss' : 'push';
  const flags = run.handFlags;
  const entry = {
    floor: run.floor,
    hand: run.handsPlayed + 1,
    result,
    net,
    doubled: flags.doubled,
    bites: flags.bites,
    burned: flags.burned,
    peeked: flags.peeked,
    split: flags.split,
    bloodAfter: blood,
  };
  const handsPlayed = run.handsPlayed + 1;
  let status = 'playing';
  let choices = [];
  let pickFor = null;
  if (blood >= run.quota) {
    if (run.floor >= FLOORS) status = 'won';
    else {
      status = 'pick';
      pickFor = 'descend';
      choices = choicesFor(run.seed, run.floor, run.relics);
    }
  } else if (blood < 2) status = 'drained';
  else if (handsPlayed >= run.handsTotal) status = 'dawn';

  const memory = memoryKey(run.log.concat(entry));
  return {
    ...run,
    game: { ...game, blood },
    handsPlayed,
    status,
    choices,
    pickFor,
    log: run.log.concat(entry),
    floorsCleared: run.floorsCleared + (status === 'pick' || status === 'won' ? 1 : 0),
    lastSettle: { net, items, result },
    lastMemory: memory && memory !== run.lastMemory ? memory : run.lastMemory,
    memoryNow: memory && memory !== run.lastMemory ? memory : null,
  };
}

function afterCore(run, game, patch = {}) {
  const was = run.game.phase;
  let next = { ...run, ...patch, game };
  if (game.phase === 'settled' && was !== 'settled') next = settleHand(next);
  return next;
}

function pick(run, id) {
  if (!run.choices.includes(id)) throw new Error('not on offer');
  const relics = run.relics.concat(id);
  const carried = { ...run, relics };
  if (run.pickFor === 'start') {
    // floor one was set up before the relic existed: rebuild it with the relic in play
    return { ...setupFloor(carried, 1, run.game.blood), status: 'playing', pickFor: null, choices: [] };
  }
  const floor = run.floor + 1;
  const blood = run.game.blood + run.tuning.floors[BOSS_ORDER[floor - 1]].bonus;
  const next = setupFloor(carried, floor, blood);
  return { ...next, status: 'playing', pickFor: null, choices: [], reached: Math.max(run.reached, floor) };
}

export function act(run, action, arg) {
  if (!legalRunActions(run).includes(action)) throw new Error(`illegal run action: ${action}`);
  const g = run.game;
  switch (action) {
    case 'pick':
      return pick(run, arg);
    case 'new_evening':
      return createRun({ seed: run.seed + 1, tuning: run.tuning });
    case 'withdraw':
      return { ...run, game: core.withdraw(g), status: 'withdrew' };
    case 'bet_up': return { ...run, game: core.betUp(g) };
    case 'bet_down': return { ...run, game: core.betDown(g) };
    case 'next_hand': return { ...run, game: core.nextHand(g), handFlags: emptyHand(), memoryNow: null };
    case 'deal': {
      let game = core.deal(g);
      if (game.phase === 'player') {
        const arm = runHook(run, 'onDeal', { game }).some((p) => p.arm);
        if (arm) game = core.arm(game);
      }
      return afterCore({ ...run, handFlags: emptyHand(), memoryNow: null }, game);
    }
    case 'hit': return afterCore(run, core.hit(g));
    case 'stand': return afterCore(run, core.stand(g));
    case 'double':
      return afterCore(run, core.doubleDown(g), { handFlags: { ...run.handFlags, doubled: true } });
    case 'split':
      return afterCore(run, core.split(g), { handFlags: { ...run.handFlags, split: true } });
    case 'bite': {
      const hooks = runHook(run, 'onBite', { game: g });
      const free = hooks.some((p) => p.free);
      let flags = run.flags;
      for (const p of hooks) flags = { ...flags, ...p.flags };
      const game = core.bite(free ? core.withRules(g, { biteCost: 0 }) : g);
      return {
        ...run,
        flags,
        game: free ? core.withRules(game, { biteCost: run.tuning.bite.cost }) : game,
        handFlags: { ...run.handFlags, bites: run.handFlags.bites + 1 },
      };
    }
    case 'keep': return afterCore(run, core.keep(g));
    case 'burn':
      return { ...run, game: core.burn(g), handFlags: { ...run.handFlags, burned: run.handFlags.burned + 1 } };
    case 'peek':
      return {
        ...run,
        game: core.peek(g),
        flags: { ...run.flags, mirror: true },
        handFlags: { ...run.handFlags, peeked: true },
      };
    default:
      throw new Error(`unknown action: ${action}`);
  }
}

function tellFor(run, boss) {
  const game = run.game;
  if (game.phase !== 'player' || !game.playerHands[game.activeHand]) return '';
  const up = game.dealerCards[0];
  const total = handValue(game.playerHands[game.activeHand].cards);
  const salt = run.seed + run.handsPlayed;
  if (up && (up.rank === 'A' || isTenValue(up))) return pickLine(boss, 'tell_high', salt);
  if (total >= 12 && total <= 16) return pickLine(boss, 'tell_poor', salt);
  if (total >= 17) return pickLine(boss, 'tell_good', salt);
  return '';
}

function ledgerText(run) {
  const s = run.lastSettle;
  if (!s || run.game.phase === 'betting' || run.game.phase === 'player' || run.game.phase === 'bite') return '';
  const total = run.game.lastResult.net + s.items.reduce((sum, i) => sum + i.delta, 0);
  const sign = total > 0 ? '+' : total < 0 ? '−' : '';
  const n = Math.abs(total);
  return `${sign}${n} ${n === 1 ? 'drop' : 'drops'}`;
}

// Expressions: hungry when your blood is low or while a Bite is open, amused when you bust.
function moodFor(run) {
  if (run.game.phase === 'bite' || run.game.blood <= 8) return 'hungry';
  if (run.game.phase === 'settled' && run.lastSettle?.result === 'bust') return 'amused';
  return 'neutral';
}

// What the page reads: the core's public view, plus the run.
export function runView(run) {
  const view = core.publicView(run.game);
  const boss = BOSSES[run.bossId];
  const terminal = isTerminal(run);
  const salt = run.seed + run.handsPlayed * 7 + run.log.length;
  let message;
  if (terminal) message = pickLine(boss, run.status === 'withdrew' ? 'withdrew' : run.status, salt);
  else if (run.status === 'pick') message = pickLine(boss, run.pickFor === 'start' ? 'intro' : 'cleared', salt);
  else if (run.game.phase === 'betting' && run.handsPlayed === 0) message = pickLine(boss, 'intro', salt);
  else if (run.game.phase === 'settled' && run.memoryNow) message = pickLine(boss, run.memoryNow, salt);
  else if (boss.lines[view.messageKey]) message = pickLine(boss, view.messageKey, salt);
  else message = view.message;

  const handsLeft = Math.max(0, run.handsTotal - run.handsPlayed);
  const lit = run.status === 'pick' && run.pickFor === 'start' ? run.handsTotal : handsLeft;
  return {
    ...view,
    phase: terminal ? 'over' : view.phase,
    evening: terminal ? run.status : null,
    actions: legalRunActions(run),
    message,
    remark: tellFor(run, boss),
    story: '',
    ledger: ledgerText(run),
    ledgerItems: run.lastSettle ? run.lastSettle.items : [],
    run: {
      status: run.status,
      pickFor: run.pickFor,
      floor: run.floor,
      bossId: run.bossId,
      boss: { id: boss.id, name: boss.name, plate: boss.plate, floorName: boss.floorName, ruleText: boss.ruleText, portrait: boss.portrait },
      mood: moodFor(run),
      handsTotal: run.handsTotal,
      handsLeft,
      candlesLit: lit,
      quota: run.quota,
      tax: run.tax,
      relics: relicsView(run),
      choices: run.choices.map((id) => ({ id, name: RELICS[id].name, effect: RELICS[id].effect, active: Boolean(RELICS[id].active) })),
      floorsCleared: run.floorsCleared,
      reached: Math.max(run.reached, run.floor),
    },
  };
}
