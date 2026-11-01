import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { candleStates } from '../src/render.js';
import { relicSpots } from '../src/layout.js';

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('src/style.css', 'utf8');
const ui = fs.readFileSync('src/ui.js', 'utf8');

test('candle stubs: a burned candle stays in the row as a stub', () => {
  assert.deepEqual(candleStates(5, 5), ['lit', 'lit', 'lit', 'lit', 'lit']);
  assert.deepEqual(candleStates(5, 3), ['lit', 'lit', 'lit', 'stub', 'stub']);
  assert.deepEqual(candleStates(5, 0), ['stub', 'stub', 'stub', 'stub', 'stub']);
  // the row never changes length as the hands run down
  for (let lit = 0; lit <= 12; lit += 1) assert.equal(candleStates(12, lit).length, 12);
  // never more lit than the floor gives, never negative, never NaN
  assert.deepEqual(candleStates(3, 9), ['lit', 'lit', 'lit']);
  assert.deepEqual(candleStates(3, -2), ['stub', 'stub', 'stub']);
  assert.deepEqual(candleStates(2, Number.NaN), ['stub', 'stub']);
  assert.deepEqual(candleStates(0, 0), []);
});

test('candle stubs are painted, in one row, with no orphan wrap', () => {
  assert.match(css, /\.candle\.stub \{[^}]*height: 11px/);
  assert.match(css, /#candles \{[^}]*flex-wrap: nowrap/);
  assert.match(ui, /candleStates\(total, lit\)/);
  // the old behaviour removed the lit class and let the candle shrink to nothing
  assert.doesNotMatch(css, /\.candle\.stub \{[^}]*display: none/);
});

test('the vial label is the number and "drops" on one line, the quota beneath', () => {
  assert.match(css, /#blood \{[^}]*display: flex/);
  assert.match(css, /#blood \{[^}]*white-space: nowrap/);
  assert.match(css, /#blood \.unit/);
  assert.match(ui, /unit\.textContent = n === 1 \? 'drop' : 'drops'/);
  assert.ok(html.indexOf('id="blood"') < html.indexOf('id="quota"'));
});

test('the stake is a stepper at every width, Deal is primary and Leave is a quiet link', () => {
  // the stepper is not inside a phone-only media query, and the old row is gone
  const at = css.indexOf('/* The stake at every width');
  const end = css.indexOf('/* One stake control at every width. */');
  const block = css.slice(at, end);
  assert.doesNotMatch(block, /@media/);
  assert.doesNotMatch(html, /Lower stake<\/button>|Raise stake<\/button>/);
  assert.match(html, /id="bet-down"[^>]*aria-keyshortcuts="-"/);
  assert.match(html, /id="bet-up"[^>]*aria-keyshortcuts="\+"/);
  assert.match(html, /id="bet-down"[^>]*aria-label="Lower stake"/);
  assert.match(html, /id="bet-up"[^>]*aria-label="Raise stake"/);
  assert.match(css, /grid-template-areas: "minus stake plus" "deal deal deal" "leave leave leave"/);
  assert.match(css, /#betting #withdraw \{[^}]*text-decoration: underline/);
  assert.match(css, /#betting #deal \{[^}]*background: #9b2331/);
});

test('Settings and Sound are the same icon buttons at every width, with labels and 44px targets', () => {
  const at = css.indexOf('/* Settings and Sound: the same icon buttons');
  assert.doesNotMatch(css.slice(at, css.indexOf('/* The stake at every width')), /@media/);
  assert.match(html, /id="settings"[^>]*aria-label="Settings"/);
  assert.match(html, /id="mute"[^>]*aria-label="Sound off"/);
  assert.match(css, /#settings, #mute \{[^}]*width: 44px[^}]*height: 44px/);
  assert.match(css, /#settings \.lbl, #mute \.lbl \{ display: none; \}/);
  assert.match(ui, /setAttribute\('aria-label', label\)/);
});

test('the relic tokens sit on an arc that follows the felt corner (src/layout.js)', () => {
  const felt = { w: 1000, h: 382 };
  const three = relicSpots(3, felt, 48, false);
  // three relics: each sits further round the bottom-left curve
  for (let i = 1; i < three.length; i += 1) {
    assert.ok(three[i].left > three[i - 1].left, `token ${i + 1} is further along`);
    assert.ok(three[i].top > three[i - 1].top, `token ${i + 1} is lower down the curve`);
  }
  // six (the cap): they climb the left side and still stop at the bottom, never past it into the controls
  const spots = relicSpots(6, felt, 48, false);
  assert.equal(spots.length, 6);
  const stop = relicSpots(3, felt, 48, false)[2];
  assert.deepEqual(spots[5], stop);
  for (let i = 1; i < spots.length; i += 1) {
    assert.ok(Math.hypot(spots[i].left - spots[i - 1].left, spots[i].top - spots[i - 1].top) >= 40);
    assert.ok(spots[i].left + 48 <= stop.left + 48, 'no token right of the bottom stop');
  }
  // all of them sit inside the felt, clear of its border
  for (const s of spots) {
    assert.ok(s.left >= 4 && s.left + 48 <= felt.w - 4);
    assert.ok(s.top >= 4 && s.top + 48 <= felt.h - 4);
  }
  // the phone keeps them on the top-right corner, away from the cards and the thumb
  const phone = relicSpots(3, { w: 362, h: 442 }, 44, true);
  assert.ok(phone.every((s) => s.left > 362 / 2));
  assert.ok(phone[0].top < 442 / 2);
  // six on the phone: spaced apart, and all to the right, beside the stake panel rather than behind it
  const six = relicSpots(6, { w: 362, h: 441 }, 44, true);
  for (let i = 1; i < six.length; i += 1) {
    assert.ok(Math.hypot(six[i].left - six[i - 1].left, six[i].top - six[i - 1].top) >= 40);
  }
  assert.ok(six.every((s) => s.left >= 362 * 0.68 && s.left + 44 <= 362 - 4));
  assert.deepEqual(relicSpots(0, felt, 48, false), []);
});
