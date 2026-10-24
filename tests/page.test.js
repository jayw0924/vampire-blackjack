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
  ]) {
    assert.equal(html.includes(`id="${id}"`), true, `missing #${id}`);
  }
  assert.match(html, /Lord Vesper's Table/);
  assert.match(html, /src\/ui\.js/);
  assert.match(html, /src\/style\.css/);
  assert.equal(html.includes('http://'), false);
  assert.equal(html.includes('https://'), false);
  assert.equal(/insurance/i.test(html), false);
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
