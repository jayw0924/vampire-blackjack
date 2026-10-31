import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  META_KEY, HINTS, bestLabel, emptyMeta, hintFor, loadMeta, markHint, noteFloor, recordRun, resetMeta, saveMeta,
} from '../src/meta.js';

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
}

test('the deepest floor survives a reload', () => {
  const store = fakeStorage();
  let meta = noteFloor(loadMeta(store), 2);
  assert.equal(saveMeta(store, meta), true);
  assert.equal(loadMeta(store).bestFloor, 2);
  assert.equal(noteFloor(meta, 1).bestFloor, 2, 'never goes down');
  assert.equal(bestLabel(meta), 'Deepest: Floor II');
});

test('escapes are counted when a run is won', () => {
  let meta = recordRun(emptyMeta(), { status: 'dawn', reached: 2 });
  assert.equal(meta.runs, 1);
  assert.equal(meta.escapes, 0);
  meta = recordRun(meta, { status: 'won', reached: 3 });
  assert.equal(meta.escapes, 1);
  assert.equal(meta.bestFloor, 3);
  assert.equal(bestLabel(meta), 'Deepest: Floor III · Escaped ×1');
});

test('broken or hostile storage is forgotten, not trusted', () => {
  assert.deepEqual(loadMeta(fakeStorage({ [META_KEY]: '{nope' })), emptyMeta());
  assert.equal(loadMeta(fakeStorage({ [META_KEY]: JSON.stringify({ bestFloor: 99, runs: -4, hintsSeen: [1, 'a'] }) })).bestFloor, 3);
  const meta = loadMeta(fakeStorage({ [META_KEY]: JSON.stringify({ bestFloor: 99, runs: -4, hintsSeen: [1, 'a'] }) }));
  assert.equal(meta.runs, 0);
  assert.deepEqual(meta.hintsSeen, ['a']);
  assert.deepEqual(loadMeta(null), emptyMeta());
  const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.deepEqual(loadMeta(throwing), emptyMeta());
  assert.equal(saveMeta(throwing, emptyMeta()), false);
});

test('the quiet reset clears the record', () => {
  const store = fakeStorage();
  saveMeta(store, noteFloor(emptyMeta(), 3));
  assert.equal(META_KEY in store.data, true);
  assert.deepEqual(resetMeta(store), emptyMeta());
  assert.equal(META_KEY in store.data, false);
});

test('first-run hints come once each, only on floor I', () => {
  const run = { status: 'playing', floor: 1, handsPlayed: 0, quota: 24, relics: [] };
  const view = { phase: 'betting', enabled: ['deal'] };
  let seen = [];
  const hint = hintFor(run, view, seen);
  assert.equal(hint.id, 'welcome');
  assert.match(hint.text, /24/);
  seen = [hint.id];
  assert.equal(hintFor(run, view, seen), null);
  assert.equal(hintFor({ ...run, floor: 2 }, view, []).id, 'floor2');
  assert.equal(hintFor({ ...run, floor: 2 }, view, ['floor2']), null);
  assert.equal(hintFor({ ...run, floor: 2, handsPlayed: 3 }, view, []), null);
  const later = hintFor({ ...run, handsPlayed: 2 }, view, seen);
  assert.equal(later.id, 'hunger');
  assert.deepEqual(markHint(emptyMeta(), 'welcome').hintsSeen, ['welcome']);
  const bite = hintFor({ ...run, handsPlayed: 2 }, { phase: 'player', enabled: ['hit', 'bite'] }, ['welcome', 'hunger']);
  assert.equal(bite.id, 'bite');
});

test('the page reads and writes the record in one place', () => {
  const src = fs.readFileSync('src/meta.js', 'utf8');
  assert.equal(src.includes('document'), false);
  assert.equal(src.includes('localStorage'), false, 'storage is passed in');
});

test('the Steward speaks the Floor I hints; later floors use neutral house text', () => {
  const run = { status: 'playing', floor: 1, handsPlayed: 0, quota: 24, relics: ['a'] };
  const ids = ['welcome', 'hunger', 'bite', 'relic'];
  for (const id of ids) {
    const text = HINTS[id](run);
    assert.doesNotMatch(text, /house's oldest|Vesper|Lamia/);
  }
  assert.match(HINTS.welcome(run), /^Good evening\./);
  assert.match(HINTS.hunger(run), /I am afraid/);
  assert.match(HINTS.bite(run), /Should you wish/);
  assert.match(HINTS.bite(run), /one drop/);
  assert.match(HINTS.relic(run), /Those tokens/);
  // neutral: no first person, no pleasantries
  for (const id of ['floor2', 'floor3']) assert.match(HINTS[id](run), /^House rule, Floor I+:/);
  assert.doesNotMatch(HINTS.floor2(run) + HINTS.floor3(run), /\bI\b/);
  assert.match(HINTS.floor2(run), /face up/);
  assert.match(HINTS.floor2(run), /Hit costs a drop/);
  assert.match(HINTS.floor3(run), /ties go to the house/i);
  const view = { phase: 'betting', enabled: ['deal'] };
  assert.equal(hintFor({ ...run, floor: 3 }, view, ['floor2']).id, 'floor3');
});
