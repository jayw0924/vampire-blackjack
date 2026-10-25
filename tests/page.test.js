import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('index.html has the parlor controls and no remote assets', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  for (const id of [
    'parlor', 'message', 'dealer-cards', 'dealer-value', 'player-hands',
    'ledger', 'blood', 'pending-bet', 'bet-down', 'bet-up', 'deal', 'withdraw',
    'hit', 'stand', 'double', 'split', 'continue', 'new-evening', 'betting',
    'actions', 'between', 'room', 'remark', 'story', 'mute',
    'manor', 'candles', 'lord', 'lord-frame', 'felt', 'stake', 'vial',
  ]) {
    assert.equal(html.includes(`id="${id}"`), true, `missing #${id}`);
  }
  assert.match(html, /Lord Vesper's Table/);
  assert.match(html, /src\/ui\.js/);
  assert.match(html, /src\/style\.css/);
  assert.match(html, /assets\/lord\.png/);
  assert.equal(html.includes('http://'), false);
  assert.equal(html.includes('https://'), false);
  assert.equal(/insurance/i.test(html), false);
});

test('the night sits outside the parlor and the cup sits in the room', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('src/style.css', 'utf8');
  const manor = html.slice(html.indexOf('id="manor"'), html.indexOf('id="ledger"'));
  assert.equal(manor.includes('id="door"'), true, 'the door is not in the stone');
  assert.equal(manor.includes('id="vial"'), true);
  assert.equal(manor.includes('id="blood"'), true, 'the blood count is not with the vial');
  assert.equal(manor.indexOf('id="vial"') < manor.indexOf('id="blood"'), true);
  assert.match(css, /body\s*\{[^}]*background:\s*#050203/);
  assert.match(css, /#14080c/);
});

test('stylesheet keeps the locked palette and no external urls', () => {
  const css = fs.readFileSync('src/style.css', 'utf8');
  assert.match(css, /#14080c/);
  assert.match(css, /#9b2331/);
  assert.match(css, /#c4a574/);
  assert.match(css, /#f3e6d0/);
  assert.match(css, /#8e2f3a/);
  assert.equal(css.includes('url('), false);
  assert.equal(/googleapis|comic sans|#7c3aed|purple/i.test(css), false);
  assert.equal(css.includes('opacity: 0.45'), false);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /data-candles/);
});

test('the parlor draws in and the door tells the plot', () => {
  const css = fs.readFileSync('src/style.css', 'utf8');
  assert.match(css, /body\[data-room="hungry"\] #manor \{[^}]*padding-left: 48px/);
  assert.match(css, /body\[data-room="close"\] #manor \{[^}]*padding-left: 32px/);
  assert.match(css, /body\[data-room="hungry"\] #door \{[^}]*width: 8px/);
  assert.match(css, /body\[data-room="close"\] #door \{[^}]*width: 3px/);
  assert.match(css, /body\[data-room="cellar"\] #door \{[^}]*#9b2331/);
  assert.match(css, /body\[data-room="departure"\] #door \{[^}]*left: 28px/);
  assert.equal(css.includes('#manor::after'), false);
});

test('one pool of light can go out', () => {
  const css = fs.readFileSync('src/style.css', 'utf8');
  assert.match(css, /--pool: 0\.4;/);
  assert.match(css, /data-candles="2"\] \{[^}]*--pool: 0\.26;/);
  assert.match(css, /data-candles="1"\] \{[^}]*--pool: 0\.14;/);
  assert.match(css, /data-candles="0"\] \{[^}]*--pool: 0;/);
});

test('the table has weight and the arch is a recess', () => {
  const css = fs.readFileSync('src/style.css', 'utf8');
  assert.match(css, /#felt \{[^}]*0 0 0 11px #1a1014/);
  assert.match(css, /#lord-frame \{[^}]*background: #050203/);
  assert.match(css, /\.card \{[^}]*background: #f3e6d0/);
  assert.match(css, /\.card \{[^}]*0 3px 0 #1a1014/);
  assert.match(css, /#c4a574/);
  assert.equal(css.includes('url('), false);
});

test('ui.js never reads the raw hole card', () => {
  const src = fs.readFileSync('src/ui.js', 'utf8');
  assert.equal(src.includes('publicView'), true);
  assert.equal(src.includes('game.dealerCards'), false);
  assert.equal(src.includes('innerHTML'), false);
  assert.equal(src.includes('insertAdjacentHTML'), false);
  assert.equal(/insurance/i.test(src), false);
  assert.equal(src.includes('Math.random'), false);
});
