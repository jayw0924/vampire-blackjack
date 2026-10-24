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

function mountCards(el, cards) {
  el.replaceChildren();
  for (const card of cards) {
    const div = document.createElement('div');
    div.className = card.hidden ? 'card back' : `card ${card.red ? 'red' : 'black'}`;
    div.setAttribute('aria-label', card.aria);
    div.textContent = card.label;
    el.append(div);
  }
}

function paint(game) {
  const view = present(publicView(game));
  document.body.dataset.room = view.room || 'composed';
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
  render();
}

boot();
