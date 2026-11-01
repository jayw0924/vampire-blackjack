import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  artFile, backdropSrc, cardBackSrc, findArt, loadArt, portraitSrc, relicFiles,
} from '../src/art.js';
import { BOSS_ORDER } from '../src/bosses.js';
import { RELIC_IDS } from '../src/relics.js';

const DIR = 'assets/art';
const manifest = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));
const art = { base: `${DIR}/`, entries: manifest };

test('every file the manifest lists is on disk, named {type}-{id}-{variant}-{size}', () => {
  for (const entry of manifest) {
    assert.equal(typeof entry.alt, 'string');
    assert.equal(typeof entry.decorative, 'boolean');
    for (const file of entry.files) {
      assert.equal(fs.existsSync(path.join(DIR, file)), true, file);
      assert.match(file, /\.(webp|png)$/);
    }
  }
});

test('every boss has all three moods and every relic has its token', () => {
  for (const id of BOSS_ORDER) {
    for (const mood of ['neutral', 'amused', 'hungry']) {
      assert.ok(findArt(art, 'portrait', id, mood), `${id} ${mood}`);
      assert.ok(portraitSrc(art, id, mood).endsWith('.webp'));
    }
  }
  for (const id of RELIC_IDS) {
    const files = relicFiles(art, id);
    assert.ok(files.webp1 && files.webp2 && files.png1 && files.big, id);
  }
  for (const floor of [1, 2, 3]) assert.ok(backdropSrc(art, floor));
  assert.ok(cardBackSrc(art));
});

test('backdrops are decorative and portraits are not', () => {
  for (const e of manifest.filter((x) => x.type === 'backdrop')) assert.equal(e.decorative, true);
  for (const e of manifest.filter((x) => x.type === 'portrait')) {
    assert.equal(e.decorative, false);
    assert.equal(e.alt.length > 20, true);
  }
});

test('image weight stays reasonable', () => {
  let total = 0;
  for (const file of fs.readdirSync(DIR)) {
    const size = fs.statSync(path.join(DIR, file)).size;
    total += size;
    assert.equal(size < 420 * 1024, true, `${file} is ${size} bytes`);
  }
  assert.equal(total < 5 * 1024 * 1024, true, `assets/art is ${total} bytes`);
  assert.equal(fs.statSync('assets/lord.webp').size < 100 * 1024, true);
  // What a first visit loads: one portrait, three relic cards, one backdrop, the card back.
  const firstLoad = [
    portraitSrc(art, 'steward', 'neutral'), backdropSrc(art, 1), cardBackSrc(art),
    ...RELIC_IDS.slice(0, 3).map((id) => relicFiles(art, id).big),
  ].reduce((sum, f) => sum + fs.statSync(f).size, 0);
  assert.equal(firstLoad < 300 * 1024, true, `first load art is ${firstLoad} bytes`);
});

test('a missing manifest leaves the table without art, not broken', async () => {
  const none = await loadArt(async () => ({ ok: false }));
  assert.deepEqual(none.entries, []);
  assert.equal(portraitSrc(none, 'steward', 'neutral'), null);
  assert.equal(backdropSrc(none, 1), null);
  assert.equal(relicFiles(none, 'tithe'), null);
  const thrown = await loadArt(async () => { throw new Error('offline'); });
  assert.deepEqual(thrown.entries, []);
  const some = await loadArt(async () => ({ ok: true, json: async () => manifest }));
  assert.equal(some.entries.length, manifest.length);
});

test('a mood that has no picture falls back to neutral', () => {
  const thin = { base: 'x/', entries: manifest.filter((e) => !(e.id === 'vesper' && e.variant === 'hungry')) };
  assert.equal(portraitSrc(thin, 'vesper', 'hungry'), portraitSrc(thin, 'vesper', 'neutral'));
  assert.equal(artFile(thin, null, '48', 'webp'), null);
});
