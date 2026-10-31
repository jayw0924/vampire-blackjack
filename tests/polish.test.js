import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { candleStates } from '../src/render.js';

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
  const end = css.indexOf('/* Relics on a short arc');
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

test('on a laptop the relics sit on an arc that follows the felt corner', () => {
  const at = css.indexOf('/* Relics on a short arc');
  assert.ok(at > 0);
  const block = css.slice(at);
  const spots = [...block.matchAll(/nth-child\((\d)\) \{ left: (-?\d+)px; bottom: (\d+)px; \}/g)]
    .map((m) => ({ n: Number(m[1]), left: Number(m[2]), bottom: Number(m[3]) }));
  assert.equal(spots.length, 6);
  // each token moves right and down the curve; the steps are even enough to avoid overlap
  for (let i = 1; i < spots.length; i += 1) {
    assert.ok(spots[i].left > spots[i - 1].left);
    assert.ok(spots[i].bottom < spots[i - 1].bottom);
    const gap = Math.hypot(spots[i].left - spots[i - 1].left, spots[i].bottom - spots[i - 1].bottom);
    assert.ok(gap >= 48, `token ${i + 1} would touch the one before it (${gap.toFixed(0)}px)`);
  }
  // the arc is a laptop thing; the phone keeps its one row
  assert.match(block, /^@media \(min-width: 900px\)/m);
});
