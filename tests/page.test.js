import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TITLE } from '../src/config.js';

test('index.html has the parlor controls and no remote assets', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  for (const id of [
    'parlor', 'message', 'dealer-cards', 'dealer-value', 'player-hands',
    'ledger', 'blood', 'pending-bet', 'bet-down', 'bet-up', 'deal', 'withdraw',
    'hit', 'stand', 'double', 'split', 'continue', 'new-evening', 'betting',
    'actions', 'between', 'room', 'remark', 'story', 'mute',
    'manor', 'candles', 'lord', 'lord-frame', 'felt', 'stake', 'vial',
    'plate', 'stamp', 'vignette', 'grain',
    'bar', 'relics', 'relic-tip', 'pick', 'pick-choices', 'bite', 'keep', 'burn',
    'quota', 'rule', 'hint', 'record', 'settings', 'settings-panel', 'forget', 'backdrop',
  ]) {
    assert.equal(html.includes(`id="${id}"`), true, `missing #${id}`);
  }
  assert.equal(html.includes(`<title>${TITLE}</title>`), true);
  assert.match(html, /src\/ui\.js/);
  assert.match(html, /src\/style\.css/);
  assert.match(html, /assets\/lord\.webp/);
  // Nothing loads from elsewhere. Absolute URLs may only appear as link-preview
  // metadata (og:url, og:image, twitter:image), which the page itself never fetches.
  assert.equal(html.includes('http://'), false);
  const loaders = html.match(/<(?:link|script|img|source|iframe)\b[^>]*>/g) || [];
  for (const tag of loaders) assert.equal(/https?:\/\//.test(tag), false, tag);
  const withoutMeta = html.replace(/<meta\b[^>]*>/g, '');
  assert.equal(withoutMeta.includes('https://'), false);
  assert.equal(/insurance/i.test(html), false);
});

test('the night sits outside the parlor and the vial sits in the frame', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('src/style.css', 'utf8');
  const manor = html.slice(html.indexOf('id="manor"'), html.indexOf('id="vignette"'));
  assert.equal(manor.includes('id="vial"'), true);
  assert.equal(manor.includes('id="blood"'), true, 'the blood count is not with the vial');
  assert.equal(manor.includes('id="ledger"'), true, 'the result line is outside the table');
  assert.equal(manor.indexOf('id="vial"') < manor.indexOf('id="blood"'), true);
  assert.equal(manor.indexOf('id="frame-top"') < manor.indexOf('id="topline"'), true);
  assert.equal(manor.includes('id="door"'), false, 'the empty door gauge is back');
  assert.equal(css.includes('#door'), false);
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

test('the parlor draws in as blood drains', () => {
  const css = fs.readFileSync('src/style.css', 'utf8');
  assert.match(css, /body\[data-room="hungry"\] #manor \{[^}]*padding-left: 48px/);
  assert.match(css, /body\[data-room="close"\] #manor \{[^}]*padding-left: 32px/);
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
  assert.equal(src.includes('runView'), true, 'the page reads the run view, which wraps publicView');
  assert.equal(src.includes('game.dealerCards'), false);
  assert.equal(src.includes('innerHTML'), false);
  assert.equal(src.includes('insertAdjacentHTML'), false);
  assert.equal(/insurance/i.test(src), false);
  assert.equal(src.includes('Math.random'), false);
});

test('the lines from the Lord sit on a plate, not on the portrait', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const lord = html.slice(html.indexOf('id="lord"'), html.indexOf('</figure>'));
  for (const id of ['message', 'remark', 'candles']) {
    assert.equal(lord.includes(`id="${id}"`), false, `#${id} is inside the portrait figure`);
  }
  const css = fs.readFileSync('src/style.css', 'utf8');
  assert.equal(/#far \{[^}]*padding-top: 132px/.test(css), false);
  assert.match(css, /#lord \{[^}]*position: relative/);
});

test('type stays legible: nothing under 0.72rem, and 44px touch targets', () => {
  const css = fs.readFileSync('src/style.css', 'utf8');
  for (const [, size] of css.matchAll(/font-size:\s*([\d.]+)rem/g)) {
    assert.equal(Number(size) >= 0.72, true, `font-size ${size}rem is too small`);
  }
  assert.equal(css.includes('#6d584c'), false, 'the old low-contrast brown is back');
  assert.match(css, /#mute \{[^}]*min-height: 44px/);
});

test('cards deal in over about 280ms, the hole card flips, and motion can be turned off', () => {
  const css = fs.readFileSync('src/style.css', 'utf8');
  assert.match(css, /\.card\.dealt \{[^}]*animation: deal-in 280ms/);
  assert.match(css, /\.card\.turning/);
  assert.match(css, /\.card\.unflip/);
  const motion = css.slice(css.indexOf('@media (prefers-reduced-motion: no-preference)'));
  assert.equal(motion.includes('.card.dealt'), true);
  assert.equal(/^\.card\.dealt/m.test(css.slice(0, css.indexOf('@media (prefers-reduced-motion: no-preference)'))), false);
});

test('the favicon exists and the page points at it', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /rel="icon" href="assets\/favicon\.svg"/);
  assert.equal(fs.existsSync('assets/favicon.svg'), true);
  assert.equal(fs.existsSync('favicon.ico'), true);
  assert.equal(fs.existsSync('assets/og.jpg'), true);
});

test('fonts are self-hosted subsets with their licenses, and nothing comes from a CDN', () => {
  const css = fs.readFileSync('src/fonts.css', 'utf8');
  assert.equal(/https?:|googleapis|gstatic/.test(css), false);
  const faces = css.match(/@font-face/g) || [];
  assert.equal(faces.length, 6);
  assert.equal((css.match(/font-display: swap/g) || []).length, 6);
  for (const [, file] of css.matchAll(/url\("\.\.\/(assets\/fonts\/[^"]+)"\)/g)) {
    assert.equal(fs.existsSync(file), true, file);
    assert.equal(fs.statSync(file).size < 30000, true, `${file} is not a subset`);
  }
  for (const license of ['OFL-CormorantGaramond.txt', 'OFL-IBMPlexMono.txt']) {
    assert.match(fs.readFileSync(`assets/fonts/${license}`, 'utf8'), /SIL OPEN FONT LICENSE Version 1\.1/i);
  }
  const style = fs.readFileSync('src/style.css', 'utf8');
  assert.match(style, /Cormorant Garamond/);
  assert.match(style, /IBM Plex Mono/);
});

test('the title folds into the frame and a slim line says where you are', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.equal(html.indexOf('id="manor"') < html.indexOf('id="frame-top"'), true);
  assert.equal(html.indexOf('id="frame-top"') < html.indexOf('id="topline"'), true);
  for (const id of ['floor-name', 'dawn-left', 'cup', 'mute']) {
    const at = html.indexOf(`id="${id}"`);
    assert.equal(at > html.indexOf('id="manor"'), true, id);
  }
  assert.equal(html.includes('<header>'), false, 'the outer header is back');
});

test('relic tokens are 48px, six fit, and their shadows live in CSS', () => {
  const css = fs.readFileSync('src/style.css', 'utf8');
  assert.match(css, /\.relic \{[^}]*width: 48px;[^}]*height: 48px;/);
  assert.match(css, /#relics \{[^}]*grid-template-columns: repeat\(3, 48px\)/);
  assert.match(css, /\.relic img \{[^}]*drop-shadow/);
  assert.match(css, /\.relic:hover/);
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /id="relic-tip" role="tooltip"/);
  assert.match(html, /id="pick" role="dialog"/);
});

test('on a phone the relics sit in one row above the action bar', () => {
  const css = fs.readFileSync('src/style.css', 'utf8');
  const phone = css.slice(css.indexOf('/* ======== the run'));
  assert.match(phone, /#relics \{[^}]*position: static;[^}]*flex-wrap: nowrap;/);
  assert.match(phone, /#bar \{[^}]*position: sticky;/);
  const html = fs.readFileSync('index.html', 'utf8');
  assert.equal(html.indexOf('id="relics"') < html.indexOf('id="controls"'), true);
});

test('art is always loaded through the manifest and every picture has a stated alt', () => {
  const src = fs.readFileSync('src/ui.js', 'utf8');
  assert.equal(src.includes('loadArt'), true);
  assert.equal(/assets\/art\//.test(src), false, 'file names live in the manifest, not in ui.js');
  assert.equal(src.includes("img.alt = ''"), true);
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /<img id="lord-portrait"[^>]*alt=""/);
  assert.equal(html.includes('lord.png'), false, 'the 1.8MB portrait is no longer loaded');
});

test('the run layer has no random numbers of its own', () => {
  for (const file of ['run', 'relics', 'bosses', 'meta', 'art']) {
    const src = fs.readFileSync(`src/${file}.js`, 'utf8');
    assert.equal(src.includes('Math.random'), false, file);
    assert.equal(src.includes('Date.now'), false, file);
  }
});
