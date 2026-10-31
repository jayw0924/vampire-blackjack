import { FLOOR_NAME, TITLE } from './config.js';
import { ART_BASE, backdropSrc, cardBackSrc, loadArt, portraitSrc, relicFiles } from './art.js';
import { grainTile } from './grain.js';
import { keyAction } from './keys.js';
import {
  bestLabel, emptyMeta, hintFor, loadMeta, markHint, noteFloor, recordRun, resetMeta, saveMeta,
} from './meta.js';
import { bloodLabel, candleStates, present, vialFilled } from './render.js';
import { RELIC_IDS } from './relics.js';
import { act as runAct, createRun, isTerminal, runView } from './run.js';
import { parseStartOptions } from './debug.js';
import { isMuted, setBlood, setCue, sfx, snap, toggleMute } from './score.js';
import { TIMING, needsStaging, stageSteps } from './stage.js';

const BUTTONS = [
  ['bet-down', 'bet_down'],
  ['bet-up', 'bet_up'],
  ['deal', 'deal'],
  ['withdraw', 'withdraw'],
  ['hit', 'hit'],
  ['stand', 'stand'],
  ['double', 'double'],
  ['split', 'split'],
  ['bite', 'bite'],
  ['keep', 'keep'],
  ['burn', 'burn'],
  ['continue', 'next_hand'],
  ['new-evening', 'new_evening'],
];

const ROMAN = ['', 'I', 'II', 'III'];

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
let quotaNow = 40;
let bloodFrame = 0;
let vialTimer = 0;

function writeBlood(n) {
  const el = must('blood');
  el.replaceChildren();
  const count = document.createElement('span');
  count.className = 'count';
  count.textContent = String(n);
  const unit = document.createElement('span');
  unit.className = 'unit';
  unit.textContent = n === 1 ? 'drop' : 'drops';
  const rest = document.createElement('span');
  rest.className = 'visually-hidden';
  rest.textContent = ' of blood';
  el.append(count, unit, rest);
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
    fillCount(must('vial'), vialFilled(n, quotaNow), 10, 'tick');
    markGoal();
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

function markGoal() {
  const vial = must('vial');
  if (vial.lastElementChild) vial.lastElementChild.classList.add('goal');
}

// ---- art: everything comes from the manifest; what it lacks stays a placeholder ----
let art = { base: ART_BASE, entries: [] };
let artLoaded = false;

function setPortrait(view) {
  const img = must('lord-portrait');
  const frame = must('lord-frame');
  const key = `${view.bossId}-${view.mood}-${artLoaded}`;
  if (img.dataset.key === key) return;
  img.dataset.key = key;
  let src = portraitSrc(art, view.bossId, view.mood);
  if (!src && artLoaded) src = img.dataset.fallback;
  if (!src) {
    frame.dataset.portrait = 'empty';
    return;
  }
  let triedPng = false;
  img.onerror = () => {
    if (!triedPng && src.endsWith('.webp') && src !== img.dataset.fallback) {
      triedPng = true;
      img.src = src.replace(/\.webp$/, '.png');
    } else {
      frame.dataset.portrait = 'empty';
    }
  };
  img.onload = () => {
    frame.dataset.portrait = img.naturalWidth > 0 ? 'set' : 'empty';
  };
  img.src = src;
}

function setBackdrop(floor) {
  const el = must('backdrop');
  const src = backdropSrc(art, floor);
  if (!src) {
    el.dataset.set = 'false';
    el.style.backgroundImage = '';
    return;
  }
  el.style.backgroundImage = `url("${src}")`;
  el.dataset.set = 'true';
}

function setCardBack() {
  const src = cardBackSrc(art);
  if (!src) return;
  // A custom property's url() resolves against the stylesheet, so give it the page's own address.
  document.body.style.setProperty('--card-back', `url("${new URL(src, document.baseURI).href}")`);
  document.body.dataset.artBack = 'true';
}

function placeholderFor(name) {
  const ph = document.createElement('span');
  ph.className = 'ph';
  ph.setAttribute('aria-hidden', 'true');
  ph.textContent = name.replace(/^The /, '').charAt(0);
  return ph;
}

// A relic's picture. alt is empty: the token has an accessible name, and the card has a visible one.
function relicPicture(relic, big) {
  const files = relicFiles(art, relic.id);
  if (!files || !(big ? files.big : files.webp1)) return placeholderFor(relic.name);
  if (big) {
    const img = document.createElement('img');
    img.src = files.big;
    img.alt = '';
    img.width = 88;
    img.height = 88;
    return img;
  }
  const picture = document.createElement('picture');
  const source = document.createElement('source');
  source.type = 'image/webp';
  source.srcset = `${files.webp1} 1x, ${files.webp2} 2x`;
  const img = document.createElement('img');
  img.src = files.png1 || files.webp1;
  if (files.png1) img.srcset = `${files.png1} 1x, ${files.png2} 2x`;
  img.alt = '';
  img.width = 48;
  img.height = 48;
  picture.append(source, img);
  return picture;
}

// ---- relic tokens and their tooltip ----
let tipTimer = 0;

function showTip(token, relic) {
  const tip = must('relic-tip');
  tip.querySelector('.name').textContent = relic.name;
  tip.querySelector('.effect').textContent = relic.active && !relic.spent
    ? `${relic.effect}`
    : relic.effect + (relic.spent ? ' (Spent this floor.)' : '');
  tip.hidden = false;
  const box = token.getBoundingClientRect();
  const w = tip.offsetWidth;
  const h = tip.offsetHeight;
  const left = Math.max(8, Math.min(window.innerWidth - w - 8, box.left + box.width / 2 - w / 2));
  const above = box.top - h - 10;
  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = `${Math.round(above >= 8 ? above : box.bottom + 10)}px`;
  token.setAttribute('aria-describedby', 'relic-tip');
  clearTimeout(tipTimer);
}

function hideTip() {
  const tip = must('relic-tip');
  tip.hidden = true;
  clearTimeout(tipTimer);
  for (const t of document.querySelectorAll('.relic[aria-describedby]')) t.removeAttribute('aria-describedby');
}

function tipFor(token, relic, ms) {
  showTip(token, relic);
  tipTimer = setTimeout(hideTip, ms);
}

let relicSig = '';
let known = new Set();

function paintRelics(view, onUse) {
  const box = must('relics');
  const sig = view.relics.map((r) => r.id).join(',');
  if (sig !== relicSig) {
    box.replaceChildren();
    for (const relic of view.relics) {
      const token = document.createElement('button');
      token.type = 'button';
      token.id = `relic-${relic.id}`;
      token.className = 'relic';
      token.dataset.relic = relic.id;
      token.setAttribute('aria-label', `${relic.name}. ${relic.effect}`);
      token.append(relicPicture(relic, false));
      if (!known.has(relic.id) && relicSig !== '' && motionOk()) token.classList.add('arrive');
      let pressTimer = 0;
      let held = false;
      const current = () => view.relics.find((r) => r.id === relic.id) || relic;
      token.addEventListener('mouseenter', () => showTip(token, current()));
      token.addEventListener('mouseleave', hideTip);
      token.addEventListener('focus', () => showTip(token, current()));
      token.addEventListener('blur', hideTip);
      token.addEventListener('pointerdown', (event) => {
        if (event.pointerType !== 'touch') return;
        held = false;
        pressTimer = setTimeout(() => {
          held = true;
          tipFor(token, current(), 2600);
        }, 420);
      });
      for (const name of ['pointerup', 'pointercancel']) {
        token.addEventListener(name, () => clearTimeout(pressTimer));
      }
      token.addEventListener('click', () => {
        if (held) {
          held = false;
          return;
        }
        if (token.classList.contains('usable')) {
          hideTip();
          token.classList.add('fired');
          onUse(relic.id);
        } else {
          tipFor(token, current(), 2600);
        }
      });
      box.append(token);
    }
    relicSig = sig;
    known = new Set(view.relics.map((r) => r.id));
  }
  for (const relic of view.relics) {
    const token = document.getElementById(`relic-${relic.id}`);
    if (!token) continue;
    const usable = relic.usable && view.enabled.includes('peek');
    token.classList.toggle('usable', usable);
    token.classList.toggle('spent', relic.spent);
    token.classList.toggle('passive', !relic.active);
    token.setAttribute('aria-disabled', String(relic.active && !usable));
  }
}

// ---- the dawn clock ----
let candlesWere = null;

function paintCandles(view) {
  const el = must('candles');
  const total = view.candlesTotal ?? 3;
  const lit = view.candlesLit ?? view.candleCount;
  const states = candleStates(total, lit);
  if (el.children.length !== states.length) {
    el.replaceChildren();
    for (let i = 0; i < states.length; i += 1) {
      const mark = document.createElement('span');
      mark.dataset.state = 'lit';
      mark.className = 'candle lit';
      el.append(mark);
    }
  }
  Array.from(el.children).forEach((mark, i) => {
    const was = mark.dataset.state;
    const now = states[i];
    mark.dataset.state = now;
    mark.className = `candle ${now}`;
    if (now === 'lit' && i === lit - 1) mark.classList.add('last');
    if (was === 'lit' && now === 'stub') mark.classList.add('snuffed');
  });
  if (candlesWere !== null && candlesWere > lit) sfx('snuff');
  candlesWere = lit;
  el.setAttribute('aria-label', view.dawnLine || '');
  if (view.dawnLine) el.setAttribute('role', 'img');
}

function paintLedger(view) {
  const ledger = must('ledger');
  const key = `${view.ledger}|${(view.ledgerItems || []).map((i) => i.label).join(';')}`;
  if (ledger.dataset.key === key) return;
  ledger.dataset.key = key;
  ledger.replaceChildren(view.ledger);
  for (const item of view.ledgerItems || []) {
    const why = document.createElement('span');
    why.className = 'why';
    why.textContent = item.label;
    ledger.append(why);
  }
  ledger.classList.remove('pop');
  if (view.ledger) {
    void ledger.offsetWidth;
    ledger.classList.add('pop');
  }
}

function costSpan(button, cost) {
  let span = button.querySelector('.cost');
  if (!span) {
    span = document.createElement('span');
    span.className = 'cost';
    span.setAttribute('aria-hidden', 'true');
    button.insertBefore(span, button.querySelector('.key'));
  }
  span.textContent = cost > 0 ? `−${cost}` : '';
  button.setAttribute('aria-label', cost > 0
    ? `${button.id === 'bite' ? 'Bite' : 'Hit'}, costs ${cost} blood` : (button.id === 'bite' ? 'Bite' : 'Hit'));
}

let hintText = '';
let recordText = '';
let recordBest = false;
let settingsRecord = '';

function paintPick(view, onPick) {
  const pick = must('pick');
  const sig = view.pick ? view.choices.map((c) => c.id).join(',') : '';
  must('parlor').inert = Boolean(view.pick);
  if (!view.pick) {
    pick.hidden = true;
    pick.dataset.sig = '';
    return;
  }
  if (pick.dataset.sig === sig && !pick.hidden) return;
  pick.dataset.sig = sig;
  pick.hidden = false;
  must('pick-sub').textContent = view.pickFor === 'start'
    ? 'One relic goes with you down the stair. You will be offered another when you take it.'
    : 'The stair is open. Take one more with you.';
  const list = must('pick-choices');
  list.replaceChildren();
  view.choices.forEach((relic, i) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.id = `pick-${i}`;
    card.className = 'relic-card';
    card.append(relicPicture(relic, true));
    const text = document.createElement('span');
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = relic.name;
    const effect = document.createElement('span');
    effect.className = 'effect';
    effect.style.display = 'block';
    effect.textContent = relic.effect;
    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = `Press ${i + 1}`;
    num.style.display = 'block';
    text.append(name, effect, num);
    card.append(text);
    card.addEventListener('click', () => onPick(relic.id));
    list.append(card);
  });
  must('pick-0').focus({ preventScroll: true });
}

function paintBite(view) {
  const slot = must('bite-slot');
  const key = view.biteCard ? view.biteCard.aria : '';
  if (slot.dataset.key !== key) {
    slot.dataset.key = key;
    slot.replaceChildren();
    if (view.biteCard) {
      const node = buildCard(view.biteCard);
      if (motionOk()) {
        node.classList.add('dealt');
        node.style.setProperty('--delay', '0ms');
      }
      snap(0);
      const caption = document.createElement('p');
      caption.className = 'caption';
      caption.textContent = 'Keep it or burn it';
      slot.append(node, caption);
      // On a phone the sticky bar covers the foot of the page: bring the card above it.
      if (globalThis.matchMedia?.('(max-width: 640px)').matches) {
        slot.scrollIntoView({ block: 'nearest', behavior: motionOk() ? 'smooth' : 'auto' });
      }
    }
  }
  const pile = must('burned');
  const burnedKey = view.burned.map((c) => c.aria).join('|');
  if (pile.dataset.key !== burnedKey) {
    pile.dataset.key = burnedKey;
    pile.replaceChildren();
    const row = document.createElement('div');
    row.className = 'cards';
    for (const card of view.burned) row.append(buildCard(card));
    const caption = document.createElement('p');
    caption.className = 'caption';
    caption.textContent = 'Burned';
    pile.append(row, caption);
  }
  pile.hidden = view.burned.length === 0;
}

function paint(view, { hold = false, onUse, onPick } = {}) {
  document.body.dataset.room = view.room || 'composed';
  must('manor').dataset.candles = String(view.candleCount);
  must('parlor').classList.toggle('low', view.lowBlood);
  must('room').textContent = view.roomLine;
  must('story').textContent = view.story;
  must('message').textContent = view.message;
  must('remark').textContent = view.remark;
  must('rule').textContent = view.ruleText || '';
  must('hint').textContent = hintText;
  const stake = must('pending-bet');
  if (stake.dataset.label !== view.stakeLabel) {
    stake.dataset.label = view.stakeLabel;
    const k = document.createElement('span');
    k.className = 'k';
    k.textContent = 'Stake: ';
    stake.replaceChildren(k, view.stakeLabel.replace(/^Stake: /, ''));
  }
  must('plate-name').textContent = view.plateName || 'The Steward';
  must('dealer-title').textContent = view.plateName || 'The dealer';
  must('lord-caption').textContent = view.plateName || '';
  must('dealer-rail').setAttribute('aria-label', view.plateName || 'The dealer');
  paintLedger(view);
  must('dawn-left').textContent = view.dawnLine || '';
  must('floor-name').textContent = view.floorName || FLOOR_NAME;
  must('quota').textContent = view.quotaLabel || '';
  quotaNow = view.quota || 40;
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
  else markGoal();
  paintCandles(view);
  fillCount(must('stake'), view.stakeDrops, view.stakeDrops, 'drop');
  setCue(view.cue);
  if (view.bossId) {
    setPortrait(view);
    must('manor').dataset.floor = String(view.floor);
    if (backdropFloor !== view.floor) {
      backdropFloor = view.floor;
      setBackdrop(view.floor);
    }
  }
  paintRelics(view, onUse || (() => {}));
  paintBite(view);

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
      : (index === 0 ? 'First hand' : (index === 1 ? 'Second hand' : 'Third hand'));
    wrap.querySelector('.num').textContent = hand.valueLabel;
    wrap.querySelector('.tag').textContent = hand.outcomeLabel;
    fresh.push(...mountCards(wrap.querySelector('.cards'), hand.cards, 0));
  });
  dealCards(fresh);

  must('bar').dataset.phase = view.phase;
  must('betting').hidden = !view.showBetting;
  must('actions').hidden = !view.showActions;
  must('bite-choice').hidden = !view.showBite;
  must('between').hidden = !(view.showNextHand || view.showNewEvening);
  must('continue').hidden = !view.showNextHand;
  must('new-evening').hidden = !view.showNewEvening;
  const record = must('record');
  record.textContent = view.showNewEvening ? recordText : '';
  record.classList.toggle('best', recordBest);
  costSpan(must('hit'), view.hitCost || 0);
  costSpan(must('bite'), view.biteCost || 0);
  for (const [id, action] of BUTTONS) {
    must(id).disabled = !view.enabled.includes(action);
  }
  paintPick(view, onPick || (() => {}));
}

let backdropFloor = null;

function storage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function boot() {
  document.title = TITLE;
  must('parlor').querySelector('h1').textContent = TITLE;
  must('grain').style.backgroundImage = `url("${grainTile()}")`;

  // Debug parameters are honoured only on a dev host or with ?debug=1, and such a
  // rehearsal table never touches the saved record.
  const start = parseStartOptions(globalThis.location?.search, globalThis.location?.hostname, Date.now());
  const store = start.rehearsal ? null : storage();
  let meta = loadMeta(store);
  const keepMeta = (next) => {
    meta = next;
    saveMeta(store, meta);
  };
  const options = start.options;
  let run = createRun(options);
  let bestAtStart = meta.bestFloor;
  keepMeta(noteFloor(meta, run.floor));
  let recorded = false;
  let shown = null;
  let timers = [];
  let scene = null;

  const writeRecord = () => {
    const base = bestLabel(meta);
    must('settings-record').textContent = base || 'No record yet. Go down the stair.';
    document.querySelector('.eyebrow').textContent = base
      ? `Castle Vesper · ${base}` : 'Castle Vesper · The Crimson Parlor';
  };
  writeRecord();

  const show = (view, extra) => {
    shown = view;
    paint(view, { ...extra, onUse: () => doAct('peek'), onPick: (id) => doAct('pick', id) });
  };
  const finish = () => {
    if (!scene) return;
    timers.forEach(clearTimeout);
    timers = [];
    const done = scene;
    scene = null;
    show(done.final);
  };

  function endEvening() {
    if (recorded || !isTerminal(run)) return;
    recorded = true;
    keepMeta(recordRun(meta, { status: run.status, reached: Math.max(run.reached, run.floor) }));
    const deepest = Math.max(run.reached, run.floor);
    recordBest = deepest > bestAtStart && (bestAtStart > 0 || deepest > 1);
    const prefix = recordBest ? 'New deepest floor · ' : '';
    recordText = `${prefix}This evening: Floor ${ROMAN[deepest]} · ${bestLabel(meta)}`;
    writeRecord();
  }

  function doAct(action, arg) {
    if (scene) return;
    const prev = shown;
    const before = run;
    const prevPhase = prev ? prev.phase : 'betting';
    if (action === 'new_evening') {
      recorded = false;
      recordText = '';
      recordBest = false;
      bestAtStart = meta.bestFloor;
      candlesWere = null;
      relicSig = '';
      backdropFloor = null;
    }
    hintText = '';
    run = runAct(run, action, arg);
    if (action === 'new_evening') keepMeta(noteFloor(meta, run.floor));
    if (run.floor > before.floor) keepMeta(noteFloor(meta, run.floor));
    endEvening();
    const raw = runView(run);
    const view = present(raw);
    // Sounds for what just happened.
    if (action === 'bite') sfx('bite');
    if (action === 'burn') sfx('burn');
    if (action === 'peek') sfx('relic');
    if (action === 'pick') sfx(before.pickFor === 'start' ? 'pick' : 'descend');
    if (run.status !== before.status) {
      if (run.status === 'dawn') sfx('dawn', 600);
      if (run.status === 'drained') sfx('drained', 600);
      if (run.status === 'won') sfx('won', 600);
      if (run.status === 'pick' && run.pickFor === 'descend') sfx('descend', 900);
    }
    // One-time lines for a first evening.
    const hint = hintFor(run, view, meta.hintsSeen);
    const settle = needsStaging(prevPhase, view);
    if (hint && !settle) {
      hintText = hint.text;
      keepMeta(markHint(meta, hint.id));
    }
    if (motionOk() && settle) {
      const dealt = Math.max(0, cardCount(view) - cardCount(shown));
      const steps = stageSteps(view, shown, dealt);
      scene = { final: view };
      steps.forEach((step, i) => {
        const last = i === steps.length - 1;
        const play = () => (last ? finish() : show(step.view, { hold: true }));
        if (step.at === 0) play();
        else timers.push(setTimeout(play, step.at));
      });
    } else {
      show(view);
    }
  }

  for (const [id, action] of BUTTONS) {
    must(id).addEventListener('click', () => doAct(action));
  }
  must('felt').addEventListener('click', (event) => {
    // A tap on the felt (not a button) skips ahead to the verdict.
    if (!(event.target instanceof Element) || event.target.closest('button')) return;
    finish();
  });
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select')) return;
    if (event.key === 'Escape') {
      hideTip();
      closeSettings();
      return;
    }
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
    const label = muted ? 'Sound off' : 'Sound on';
    must('mute').querySelector('.lbl').textContent = label;
    must('mute').setAttribute('aria-label', label);
    must('mute').dataset.on = String(!muted);
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

  // Settings: your record, and a two-step way to forget it.
  let armTimer = 0;
  const disarm = () => {
    clearTimeout(armTimer);
    const button = must('forget');
    button.dataset.armed = 'false';
    button.textContent = 'Forget my record';
  };
  function closeSettings() {
    must('settings-panel').hidden = true;
    must('settings').setAttribute('aria-expanded', 'false');
    must('forget-note').textContent = '';
    disarm();
  }
  must('settings').addEventListener('click', (event) => {
    const open = must('settings-panel').hidden;
    must('settings-panel').hidden = !open;
    must('settings').setAttribute('aria-expanded', String(open));
    if (!open) closeSettings();
    if (event.detail > 0) must('settings').blur();
  });
  must('forget').addEventListener('click', () => {
    const button = must('forget');
    if (button.dataset.armed !== 'true') {
      button.dataset.armed = 'true';
      button.textContent = 'Press again to forget';
      must('forget-note').textContent = 'This clears your deepest floor and every hint. It cannot be undone.';
      armTimer = setTimeout(disarm, 4000);
      return;
    }
    meta = resetMeta(store);
    bestAtStart = 0;
    disarm();
    must('forget-note').textContent = 'Forgotten.';
    writeRecord();
  });
  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    if (!event.target.closest('.relic')) hideTip();
    if (!must('settings-panel').hidden && !event.target.closest('#settings-panel, #settings')) closeSettings();
  });
  window.addEventListener('scroll', hideTip, { passive: true });

  const portrait = must('lord-portrait');
  portrait.addEventListener('load', () => {
    must('lord-frame').dataset.portrait = portrait.naturalWidth > 0 ? 'set' : 'empty';
  });

  show(present(runView(run)));
  hintText = '';
  const first = hintFor(run, shown, meta.hintsSeen);
  if (first) {
    hintText = first.text;
    keepMeta(markHint(meta, first.id));
    show(present(runView(run)));
  }

  // The art loads after the table is up; the table works without it.
  loadArt().then((loaded) => {
    art = loaded;
    artLoaded = true;
    setCardBack();
    backdropFloor = null;
    relicSig = '';
    must('pick').dataset.sig = '';
    if (shown) show(shown);
    document.body.dataset.art = loaded.entries.length ? 'ready' : 'none';
  });
}

boot();
