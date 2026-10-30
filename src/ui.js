import {
  betDown, betUp, createGame, deal, doubleDown, hit, newEvening,
  nextHand, publicView, split, stand, withdraw,
} from './game.js';
import { FLOOR_NAME, TITLE } from './config.js';
import { grainTile } from './grain.js';
import { keyAction } from './keys.js';
import { bloodLabel, present, vialFilled } from './render.js';
import { isMuted, setBlood, setCue, snap, toggleMute } from './score.js';
import { TIMING, needsStaging, stageSteps } from './stage.js';

const BUTTONS = [
  ['bet-down', 'bet_down', betDown],
  ['bet-up', 'bet_up', betUp],
  ['deal', 'deal', deal],
  ['withdraw', 'withdraw', withdraw],
  ['hit', 'hit', hit],
  ['stand', 'stand', stand],
  ['double', 'double', doubleDown],
  ['split', 'split', split],
  ['continue', 'next_hand', nextHand],
  ['new-evening', 'new_evening', newEvening],
];

function must(id) {
  const el = document.querySelector(`#${id}`);
  if (!el) throw new Error(`missing #${id}`);
  return el;
}

// Keep the same elements and toggle their state, so CSS transitions can run.
function fillCount(el, count, total, className) {
  if (el.children.length !== total) {
    el.replaceChildren();
    for (let i = 0; i < total; i += 1) {
      const mark = document.createElement('span');
      mark.className = className;
      el.append(mark);
    }
  }
  Array.from(el.children).forEach((mark, i) => {
    const on = i < count;
    mark.className = className;
    if (on) mark.classList.add('on');
    if (on && className === 'candle') mark.classList.add('lit');
    if (on && className === 'tick') mark.classList.add('filled');
  });
}

function motionOk() {
  return !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function buildCard(card) {
  const div = document.createElement('div');
  div.className = card.hidden ? 'card back' : `card ${card.red ? 'red' : 'black'}`;
  div.dataset.key = card.hidden ? 'hole' : card.aria;
  div.setAttribute('aria-label', card.aria);
  if (card.hidden) {
    const mark = document.createElement('span');
    mark.className = 'back-mark';
    mark.setAttribute('aria-hidden', 'true');
    div.append(mark);
    return div;
  }
  const corner = (extra) => {
    const el = document.createElement('span');
    el.className = extra ? 'corner minor' : 'corner';
    el.setAttribute('aria-hidden', 'true');
    const rank = document.createElement('span');
    rank.className = 'rank';
    rank.textContent = card.rank;
    const suit = document.createElement('span');
    suit.className = 'suit';
    suit.textContent = card.suitGlyph;
    el.append(rank, suit);
    return el;
  };
  const pip = document.createElement('span');
  pip.className = 'pip';
  pip.setAttribute('aria-hidden', 'true');
  pip.textContent = card.suitGlyph;
  div.append(corner(false), pip, corner(true));
  return div;
}

// Turn the hole card: it goes edge-on, then the face turns in.
function revealHole(old, card) {
  old.dataset.flipping = 'true';
  const swap = () => {
    if (!old.isConnected) return;
    const face = buildCard(card);
    if (motionOk()) face.classList.add('unflip');
    old.replaceWith(face);
  };
  if (!motionOk()) {
    swap();
    return;
  }
  old.classList.add('turning');
  setTimeout(swap, 200);
}

// Keep the cards already on the felt and only add what is new, so a Hit does
// not replay the whole hand. Returns the cards that need to travel in.
function mountCards(el, cards, side) {
  const fresh = [];
  const have = Array.from(el.children);
  let keep = 0;
  while (keep < cards.length && keep < have.length) {
    const want = cards[keep].hidden ? 'hole' : cards[keep].aria;
    const now = have[keep];
    if (now.dataset.key === want) {
      keep += 1;
    } else if (now.dataset.key === 'hole' && !cards[keep].hidden) {
      if (now.dataset.flipping !== 'true') revealHole(now, cards[keep]);
      keep += 1;
    } else {
      break;
    }
  }
  for (const node of have.slice(keep)) node.remove();
  for (let i = keep; i < cards.length; i += 1) {
    const node = buildCard(cards[i]);
    el.append(node);
    fresh.push({ node, side, index: i });
  }
  return fresh;
}

function dealCards(fresh) {
  fresh.sort((x, y) => x.index - y.index || x.side - y.side);
  fresh.forEach(({ node }, n) => {
    const delay = n * TIMING.deal;
    if (motionOk()) {
      node.classList.add('dealt');
      node.style.setProperty('--delay', `${delay}ms`);
    }
    snap(delay);
  });
}

function cardCount(view) {
  if (!view) return 0;
  const mine = view.playerHands.reduce((sum, hand) => sum + hand.cards.length, 0);
  return mine + Math.min(view.dealerCards.length, 2);
}

function handNode(index) {
  const wrap = document.createElement('div');
  wrap.className = 'hand';
  const label = document.createElement('p');
  label.className = 'label';
  const row = document.createElement('div');
  row.className = 'cardrow';
  const cards = document.createElement('div');
  cards.className = 'cards';
  const total = document.createElement('p');
  total.className = 'total';
  const num = document.createElement('span');
  num.className = 'num';
  const tag = document.createElement('span');
  tag.className = 'tag';
  total.append(num, tag);
  row.append(cards, total);
  wrap.append(label, row);
  wrap.dataset.index = String(index);
  return wrap;
}

let bloodShown = null;
let bloodFrame = 0;
let vialTimer = 0;

function writeBlood(n) {
  const el = must('blood');
  el.replaceChildren();
  const count = document.createElement('span');
  count.className = 'count';
  count.textContent = String(n);
  el.append(count, n === 1 ? 'drop of blood' : 'drops of blood');
}

function flashVial(kind) {
  const vial = must('vial');
  vial.classList.remove('gain', 'loss');
  void vial.offsetWidth;
  vial.classList.add(kind);
  clearTimeout(vialTimer);
  vialTimer = setTimeout(() => vial.classList.remove('gain', 'loss'), 1100);
}

function showBlood(view) {
  const apply = (n) => {
    writeBlood(n);
    fillCount(must('vial'), vialFilled(n), 10, 'tick');
  };
  cancelAnimationFrame(bloodFrame);
  const from = bloodShown;
  bloodShown = view.blood;
  setBlood(view.blood);
  if (from === null || from === view.blood || !motionOk()) {
    apply(view.blood);
    return;
  }
  flashVial(view.blood > from ? 'gain' : 'loss');
  const start = performance.now();
  const span = 900;
  const step = (now) => {
    const t = Math.min(1, (now - start) / span);
    const eased = 1 - (1 - t) * (1 - t);
    apply(t >= 1 ? view.blood : Math.round(from + (view.blood - from) * eased));
    if (t < 1) bloodFrame = requestAnimationFrame(step);
  };
  bloodFrame = requestAnimationFrame(step);
}

function paint(view, { hold = false } = {}) {
  document.body.dataset.room = view.room || 'composed';
  must('manor').dataset.candles = String(view.candleCount);
  must('parlor').classList.toggle('low', view.lowBlood);
  must('room').textContent = view.roomLine;
  must('story').textContent = view.story;
  must('message').textContent = view.message;
  must('remark').textContent = view.remark;
  must('pending-bet').textContent = view.stakeLabel;
  const ledger = must('ledger');
  if (ledger.textContent !== view.ledger) {
    ledger.textContent = view.ledger;
    ledger.classList.remove('pop');
    if (view.ledger) {
      void ledger.offsetWidth;
      ledger.classList.add('pop');
    }
  }
  must('dawn-left').textContent = view.dawnLine || '';
  must('floor-name').textContent = view.floorName || FLOOR_NAME;
  must('dealer-value').textContent = view.dealerValueLabel;
  const stamp = must('stamp');
  stamp.textContent = view.stamp;
  if (view.stamp) stamp.dataset.kind = view.stamp.toLowerCase();
  else delete stamp.dataset.kind;
  // Press the seal onto your cards.
  const felt = must('felt').getBoundingClientRect();
  const mine = must('player-hands').getBoundingClientRect();
  stamp.style.top = `${Math.round(mine.top + mine.height / 2 - felt.top)}px`;
  stamp.style.left = `${Math.round(mine.left + mine.width / 2 - felt.left)}px`;
  if (!hold) showBlood(view);
  fillCount(must('candles'), view.candleCount, 3, 'candle');
  fillCount(must('stake'), view.stakeDrops, view.stakeDrops, 'drop');
  setCue(view.cue);

  const fresh = mountCards(must('dealer-cards'), view.dealerCards, 1);
  const hands = must('player-hands');
  hands.classList.toggle('multi', view.playerHands.length > 1);
  while (hands.children.length > view.playerHands.length) hands.lastElementChild.remove();
  while (hands.children.length < view.playerHands.length) hands.append(handNode(hands.children.length));
  view.playerHands.forEach((hand, index) => {
    const wrap = hands.children[index];
    wrap.className = hand.active ? 'hand active' : 'hand';
    wrap.querySelector('.label').textContent = view.playerHands.length === 1
      ? 'Your hand'
      : (index === 0 ? 'First hand' : 'Second hand');
    wrap.querySelector('.num').textContent = hand.valueLabel;
    wrap.querySelector('.tag').textContent = hand.outcomeLabel;
    fresh.push(...mountCards(wrap.querySelector('.cards'), hand.cards, 0));
  });
  dealCards(fresh);

  must('betting').hidden = !view.showBetting;
  must('actions').hidden = !view.showActions;
  must('between').hidden = !(view.showNextHand || view.showNewEvening);
  must('continue').hidden = !view.showNextHand;
  must('new-evening').hidden = !view.showNewEvening;
  for (const [id, action] of BUTTONS) {
    must(id).disabled = !view.enabled.includes(action);
  }
}

function boot() {
  document.title = TITLE;
  must('parlor').querySelector('h1').textContent = TITLE;
  must('grain').style.backgroundImage = `url("${grainTile()}")`;

  let game = createGame({ seed: Date.now() >>> 0 });
  let shown = null;
  let handNo = 0;
  let timers = [];
  let scene = null;

  const show = (view, options) => {
    shown = view;
    paint(view, options);
  };
  const finish = () => {
    if (!scene) return;
    timers.forEach(clearTimeout);
    timers = [];
    const done = scene;
    scene = null;
    show(done.final);
  };
  const act = (fn) => {
    if (scene) return;
    const prevPhase = publicView(game).phase;
    if (fn === deal) handNo += 1;
    if (fn === newEvening) handNo = 0;
    game = fn(game);
    const view = present(publicView(game));
    view.dawnLine = `Hand ${Math.max(handNo, 1)}`;
    if (motionOk() && needsStaging(prevPhase, view)) {
      const dealt = Math.max(0, cardCount(view) - cardCount(shown));
      const steps = stageSteps(view, shown, dealt);
      scene = { final: view };
      steps.forEach((step, i) => {
        const last = i === steps.length - 1;
        const run = () => (last ? finish() : show(step.view, { hold: true }));
        if (step.at === 0) run();
        else timers.push(setTimeout(run, step.at));
      });
    } else {
      show(view);
    }
  };

  for (const [id, , fn] of BUTTONS) {
    must(id).addEventListener('click', () => act(fn));
  }
  must('felt').addEventListener('click', (event) => {
    // A tap on the felt (not a button) skips ahead to the verdict.
    if (!(event.target instanceof Element) || event.target.closest('button')) return;
    finish();
  });
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select')) return;
    const isSpace = event.key === ' ';
    if (scene) {
      if (isSpace || event.key === 'Enter') {
        event.preventDefault();
        finish();
      }
      return;
    }
    // A focused button already answers Space and Enter natively.
    if ((isSpace || event.key === 'Enter') && event.target instanceof HTMLButtonElement) return;
    const id = keyAction(event.key, shown ? shown.enabled : []);
    if (!id) return;
    event.preventDefault();
    must(id).click();
  });

  const sync = () => {
    const muted = isMuted();
    must('mute').textContent = muted ? 'Sound off' : 'Sound on';
    must('mute').setAttribute('aria-pressed', String(!muted));
  };
  must('mute').addEventListener('click', (event) => {
    toggleMute();
    sync();
    // After a mouse or touch click, hand the keyboard back to the table
    // (Space should deal, not flip the sound again).
    if (event.detail > 0) must('mute').blur();
  });
  sync();

  const portrait = must('lord-portrait');
  const markPortrait = () => {
    must('lord-frame').dataset.portrait = portrait.naturalWidth > 0 ? 'set' : 'empty';
  };
  portrait.addEventListener('load', markPortrait);
  portrait.addEventListener('error', () => {
    must('lord-frame').dataset.portrait = 'empty';
  });
  if (portrait.complete) markPortrait();
  const first = present(publicView(game));
  first.dawnLine = 'Hand 1';
  show(first);
}

boot();
