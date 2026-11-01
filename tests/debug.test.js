import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isDevHost, parseStartOptions } from '../src/debug.js';
import { createRun, runView } from '../src/run.js';
import { present, vialFilled } from '../src/render.js';

const URL = '?seed=7&floor=3&blood=44&relics=tithe,lantern&hands=4&quota=30';

test('on the live site the debug overrides are ignored; only the seed counts', () => {
  for (const host of ['vampire-blackjack.vercel.app', 'vampire-blackjack-git-vigil-run-jay-3dsource.vercel.app', 'example.com', '']) {
    const { options, rehearsal, ignored } = parseStartOptions(URL, host, 5);
    assert.deepEqual(options, { seed: 7 }, host);
    assert.equal(rehearsal, false);
    assert.deepEqual(ignored, ['floor', 'blood', 'relics', 'hands', 'quota']);
  }
  assert.deepEqual(parseStartOptions('?quota=3', 'vampire-blackjack.vercel.app', 9).options, { seed: 9 });
  assert.deepEqual(parseStartOptions('?debug=true&quota=3', 'x.vercel.app', 9).options, { seed: 9 });
});

test('a dev host or an explicit ?debug=1 turns them on, as a rehearsal', () => {
  assert.ok(isDevHost('localhost') && isDevHost('127.0.0.1') && isDevHost('[::1]') && isDevHost('box.local'));
  assert.equal(isDevHost('localhost.evil.com'), false);
  for (const [search, host] of [[URL, 'localhost'], [`${URL}&debug=1`, 'x.vercel.app']]) {
    const { options, rehearsal } = parseStartOptions(search, host, 5);
    assert.equal(rehearsal, true);
    assert.equal(options.floor, 3);
    assert.equal(options.blood, 44);
    assert.equal(options.tuning.floors.vesper.quota, 30);
  }
  // a plain seed is not a rehearsal, even on localhost
  assert.equal(parseStartOptions('?seed=3', 'localhost', 5).rehearsal, false);
});

test('a real run (no parameters) uses the shipped tuning, never an override', () => {
  const { options } = parseStartOptions('', 'vampire-blackjack.vercel.app', 123);
  const run = createRun(options);
  assert.equal(run.quota, 24);
  assert.equal(run.floor, 1);
});

test('the page keeps a rehearsal away from the saved record', () => {
  const ui = fs.readFileSync('src/ui.js', 'utf8');
  assert.match(ui, /parseStartOptions\(/);
  assert.match(ui, /const store = start\.rehearsal \? null : storage\(\)/);
  assert.doesNotMatch(ui, /new URLSearchParams/);
});

test('the vial fills against the current floor quota, clamped', () => {
  assert.equal(vialFilled(26, 24), 10);
  assert.equal(vialFilled(99, 24), 10);
  assert.equal(vialFilled(24, 24), 10);
  assert.equal(vialFilled(12, 24), 5);
  assert.equal(vialFilled(1, 48), 1);
  assert.equal(vialFilled(24, 48), 5);
  assert.equal(vialFilled(-3, 24), 0);
  // the same blood reads fuller on an easier floor
  assert.ok(vialFilled(24, 24) > vialFilled(24, 48));
  // end to end through the run view: 26 drops on a quota-24 floor reads full
  const run = createRun({ seed: 1, blood: 26 });
  const shown = present(runView(run));
  assert.equal(run.quota, 24);
  assert.equal(shown.vialFilled, 10);
  const deep = present(runView(createRun({ seed: 1, floor: 3, blood: 26 })));
  assert.ok(deep.vialFilled < 10);
});
