import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TITLE, TAGLINE, SITE_URL } from '../src/config.js';

test('the working title is one constant, and the page follows it', () => {
  assert.equal(TITLE, 'Vigil');
  const html = fs.readFileSync('index.html', 'utf8');
  assert.equal(html.includes(`<title>${TITLE}</title>`), true);
  assert.equal(html.includes('<h1>' + TITLE + '</h1>'), true);
  for (const tag of ['og:title', 'og:site_name']) {
    assert.equal(html.includes(`property="${tag}" content="${TITLE}"`), true, tag);
  }
  assert.equal(html.includes(`name="twitter:title" content="${TITLE}"`), true);
  for (const tag of ['description']) {
    assert.equal(html.includes(`name="${tag}" content="${TAGLINE}"`), true, tag);
  }
  assert.equal(html.includes(`property="og:description" content="${TAGLINE}"`), true);
  assert.equal(html.includes(`name="twitter:description" content="${TAGLINE}"`), true);
  assert.equal(html.includes(`property="og:url" content="${SITE_URL}"`), true);
});

test('the old working title is gone from the shipped files', () => {
  for (const file of ['index.html', 'src/ui.js', 'src/config.js', 'README.md']) {
    assert.equal(/ichor/i.test(fs.readFileSync(file, 'utf8')), false, file);
  }
});
