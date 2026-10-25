import {
  betDown, betUp, createGame, deal, doubleDown, hit, newEvening,
  nextHand, publicView, split, stand, withdraw,
} from './game.js';
import { present } from './render.js';
import { setCue, toggleMute } from './score.js';

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

function fillCount(el, count, total, className) {
  el.replaceChildren();
  for (let i = 0; i < total; i += 1) {
    const mark = document.createElement('span');
    mark.className = i < count ? `${className} on` : className;
    if (className === 'candle' && i < count) mark.classList.add('lit');
    if (className === 'tick' && i < count) mark.classList.add('filled');
    el.append(mark);
  }
}

function mountCards(el, cards) {
  el.replaceChildren();
  for (const card of cards) {
    const div = document.createElement('div');
    div.className = card.hidden ? 'card back' : `card ${card.red ? 'red' : 'black'}`;
    div.setAttribute('aria-label', card.aria);
    if (card.hidden) {
      const mark = document.createElement('span');
      mark.className = 'back-mark';
      mark.setAttribute('aria-hidden', 'true');
      div.append(mark);
    } else {
      const top = document.createElement('span');
      top.className = 'corner';
      top.textContent = card.label;
      const pip = document.createElement('span');
      pip.className = 'pip';
      pip.setAttribute('aria-hidden', 'true');
      pip.textContent = card.suitGlyph;
      const bottom = document.createElement('span');
      bottom.className = 'corner minor';
      bottom.setAttribute('aria-hidden', 'true');
      bottom.textContent = card.label;
      div.append(top, pip, bottom);
    }
    el.append(div);
  }
}

function paint(game) {
  const view = present(publicView(game));
  document.body.dataset.room = view.room || 'composed';
  must('manor').dataset.candles = String(view.candleCount);
  must('parlor').classList.toggle('low', view.lowBlood);
  must('room').textContent = view.roomLine;
  must('story').textContent = view.story;
  must('message').textContent = view.message;
  must('remark').textContent = view.remark;
  must('blood').textContent = view.bloodLabel;
  must('pending-bet').textContent = view.stakeLabel;
  must('ledger').textContent = view.ledger;
  must('dealer-value').textContent = view.dealerValueLabel;
  mountCards(must('dealer-cards'), view.dealerCards);
  fillCount(must('candles'), view.candleCount, 3, 'candle');
  fillCount(must('stake'), view.stakeDrops, view.stakeDrops, 'drop');
  fillCount(must('vial'), view.vialFilled, 10, 'tick');
  setCue(view.cue);

  const hands = must('player-hands');
  hands.replaceChildren();
  view.playerHands.forEach((hand, index) => {
    const wrap = document.createElement('div');
    wrap.className = hand.active ? 'hand active' : 'hand';
    const label = document.createElement('p');
    label.textContent = view.playerHands.length === 1
      ? 'Your hand'
      : (index === 0 ? 'First hand' : 'Second hand');
    const cards = document.createElement('div');
    cards.className = 'cards';
    mountCards(cards, hand.cards);
    const value = document.createElement('p');
    value.textContent = hand.outcomeLabel
      ? `${hand.valueLabel} · ${hand.outcomeLabel}`
      : hand.valueLabel;
    wrap.append(label, cards, value);
    hands.append(wrap);
  });

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
  let game = createGame({ seed: Date.now() >>> 0 });
  const render = () => paint(game);
  for (const [id, , fn] of BUTTONS) {
    must(id).addEventListener('click', () => {
      game = fn(game);
      render();
    });
  }
  must('mute').addEventListener('click', () => {
    const muted = toggleMute();
    must('mute').textContent = muted ? 'Let the room speak' : 'Silence the room';
  });
  const portrait = must('lord-portrait');
  const portraits = ['assets/lord.webp', 'assets/lord.png', 'assets/lord.jpg', 'assets/lord.jpeg'];
  const tryPortrait = (index) => {
    if (index >= portraits.length) return;
    portrait.addEventListener('load', () => {
      must('lord-frame').dataset.portrait = 'set';
    }, { once: true });
    portrait.addEventListener('error', () => tryPortrait(index + 1), { once: true });
    portrait.src = portraits[index];
  };
  tryPortrait(0);
  render();
}

boot();
