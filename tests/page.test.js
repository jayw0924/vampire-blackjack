import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('index.html has the parlor controls and no remote assets', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  for (const id of [
    'parlor', 'message', 'dealer-cards', 'dealer-value', 'player-hands',
    'ledger', 'blood', 'pending-bet', 'bet-down', 'bet-up', 'deal', 'withdraw',
    'hit', 'stand', 'double', 'split', 'continue', 'new-evening', 'betting',
    'actions', 'between',
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
