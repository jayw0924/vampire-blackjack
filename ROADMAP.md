# Vigil

(Lord Vesper's table. The title lives in one constant, `src/config.js`: `TITLE`. Rename there, then make `index.html` match; `tests/config.test.js` checks it.)

Status file for every session in this project. Read this first. Update it last if you change direction.

Host path: `~/projects/personal/side-projects/vampire-blackjack`
Serve: `python3 -m http.server 8765 --bind 127.0.0.1` then open http://127.0.0.1:8765/
Tests: `node --test` from the project root.

## What this is

Vampire blackjack as a roguelite descent. The stake is blood. The dealer is Lord Vesper, who is the final boss. Standard blackjack stays the core: hit, stand, double, split.

Scope lock, updated 2026-10-30: the old rule "no second currency, special cards, rites, a map, or a shop" is **lifted** because jay asked for those things. What is now allowed, in build order: a run layer (floors, a dawn clock, a hunger tax, a quota to descend), a Bite action, relics, boss dealers with one rule each, Vesper reactions with memory, and a local best-floor record. A second currency (a meta-currency between runs) and a shop or pick-a-relic screen are allowed when their stage comes. Special cards (hazards) and a map stay out of the first build.

Locks that stay:

- The hole card never reaches the page early. The page reads `runView` only, which is `publicView` plus the run. The staged dealer turn replays what the settled view already shows; it never reads the hidden card.
- Sound stays off until the player turns on **Sound**.
- No CDN. No hotlinked images. Fonts, if added, are self-hosted.
- Game framing only. The stake is blood. No cash-out, no real-money wording, no odds-and-payout marketing.
- The 39 original tests stay green. New rules get new tests.

## Locked rules (the blackjack core)

- Start 20 drops. Bet 2, 4, 6, 8, or 10. Blackjack pays 3:2. Dealer stands on soft 17.
- Win at 40. Drained below 2. Leave only before the deal. These are the single-evening rules and `createGame` still plays them by default. The run layer (`src/run.js`) wraps the core through a rules object (`CORE_RULES` in `src/game.js`): `dealerStandOn`, `holeUp`, `hitCost`, `biteEnabled`, `biteCost`, `maxHands`, `autoEnd`, `satedAt`. In a run `autoEnd` is off and the run decides when an evening ends: quota (take the stair), dawn (the hands run out), or drained (below 2).
- Tuned numbers live in `src/tuning.js` and are measured by `node tools/sim.mjs` (see Stage 2).
- Hole card stays hidden during the player's turn.

## Sessions

Sessions share files and do not share chat history. Do not edit the same file from two sessions at once.

| Session | Owns | Does not touch |
|---|---|---|
| Table | `src/game.js`, `src/rules.js`, `src/cards.js`, the planned `src/run.js`, relic and boss data, `tests/game.test.js`, `tests/rules.test.js`, `tests/run.test.js` | `src/style.css`, `assets/`, `index.html` |
| Design and artwork | `index.html`, `src/style.css`, `src/ui.js`, `src/render.js`, `src/stage.js`, `src/keys.js`, `src/grain.js`, `src/score.js`, `src/config.js`, `assets/` | `src/game.js`, `src/rules.js`, `src/run.js` |

`src/atmosphere.js` and `src/lines.js` are shared: Table adds the events and keys, Design writes the words. `src/run.js` wraps `game.js`; it must not fork the core.

## Design direction

Chosen direction: **One pool of light.** The window is the room. The oval sits low. Buttons are on the near rim. The arch is on the far rim.

Done:

- Felt has a wood rail and a brass hairline. Cards have a bottom edge. Faces stay cream.
- The night outside the parlor is `#050203`. The name is a gold plaque. Blood sits with the vial.
- One pool, driven by candle count, can go out. It is not a fade on the cards or the felt.
- Portraits are the Forge set in `assets/art/` (nine, three moods for each of three dealers), loaded through `assets/art/manifest.json`. They have no arch painted in; the arch is a CSS mask, and `object-position` is `center 8%`. `assets/lord.webp` (19KB) is the fallback if the manifest fails; the 1.8MB `assets/lord.png` is no longer loaded.

Still open for the design session:

- Open the page and confirm the crop, the door, and whether the arch still reads as a box. Add stone blocks only if it does.
- Gold stays on the name and the card back. Brass marks the felt, the focus rings, and the frame.
- No full-bleed castle painting. No CDN. No hotlinked images.
- Later, not now: a small frame shift when he drinks or pays. Not a sprite, not eye-glows. A pulse swell in `src/score.js` is not this session's file.

## Portrait brief

If the portrait is replaced: one local still, chest up, dark background near `#14080c`, no text, no comedy fangs, no red eyes, no cape, no moon. Bottom fifth may be covered by the felt.

## Tone

jay's references: Vampire: The Masquerade, Bloodlines, and Buckshot Roulette.

- A tight, face-to-face table. Vesper and the bosses sit across the felt; the dealer is always watching you.
- Relics are physical items on the table, not menu icons.
- Lo-fi grain and grime: a film grain and a vignette that closes as blood drains.
- Tension comes from the dealer's patience. He looks at you before he turns his card. The beats are slow on purpose.
- Noir dealer lines with memory: short, dry, and aware of what you did last hand.

For the first build this shapes visuals, motion and Vesper's lines only. Dialogue choices and a clan pick are phase 2.

## Stage 1 (quick wins) status

Shipped on branch `vigil-quickwins`: the title constant, the portrait plate (his lines no longer sit on the portrait; candles stand on a ledge), cards that do not overlap the arch, big hand totals, one index per card corner, a 280ms staggered deal-in, a hole-card flip, a staged dealer turn, a blood count tween with Bust and Blackjack stamps, a synthesized card snap and heartbeat, a visible Sound toggle, 390px fixes, a favicon and link-preview tags, keyboard shortcuts (H, S, D, Space), and legible type. A CSS vignette and a generated grain tile carry the tone.

Stage 1b (review fixes): the header is folded into the frame's top edge, the empty door gauge is gone, the vial lives in the frame (vertical at the right on desktop, a compact horizontal vial in the top line on phones), the result line sits under the vial, the Bust and Blackjack seal lands on your cards, hand totals sit beside the cards, cards are 15% larger at 1280, the action bar is sticky on phones, and Cormorant Garamond and IBM Plex Mono are self-hosted (OFL licenses in `assets/fonts/`). The whole table fits 1280x800 without scrolling.

Keyboard: H hit, S stand, D double, Space deals, moves on, or begins another evening. Tapping the felt (or pressing Space) during the dealer's turn skips to the verdict.

Everything that was listed as still to come after Stage 1 (the run layer, dawn clock, hunger tax, Bite, relics, three floors with bosses, Vesper's memory, more juice, a best-floor record) is in Stage 2 below.

## Stage 2 (the run) status

Shipped on branch `vigil-run`, stacked on `vigil-quickwins`.

- `src/run.js` wraps the seeded core and does not fork it. A run is three floors; each floor has a hand limit (the dawn clock), a quota to take the stair, and a hunger tax. Reach the quota and you choose a relic and descend; run out of hands and dawn ends the evening; fall below 2 blood and you are drained. Clear Floor III to leave.
- Core actions added (all pure, all tested): **Bite** (pay blood, draw one card, then Keep it or Burn it, once per hand), `burn`, and a one-time look at the hole card (`arm`/`peek`) for the Silver Mirror. Boss rules live in the core: Lamia deals face up and a Hit costs 1 blood; Vesper stands on 18.
- Six relics with hooks `onDeal`, `onBite`, `onBust`, `onWin` (plus `onLoss`, `onFloorStart`, `onRules`): Charon's Obol, Silver Mirror, Lamia's Tooth, Hecate's Key, The Tithe, The Lantern. Relic choices are seeded.
- Three bosses as data in `src/bosses.js`: lines per event, a short event log in the run (streaks, doubles, busts at low blood, Bite habit, the mirror) that picks his memory lines.
- `src/meta.js` keeps the deepest floor and escapes in the browser's local store (settings has a two-step "Forget my record"). `src/art.js` loads the Forge art through the manifest; anything the manifest lacks stays a CSS placeholder.
- Debug and screenshot parameters on the URL: `?seed=7&floor=3&blood=44&relics=tithe,lantern&hands=4&quota=30`.

Balance: run `node tools/sim.mjs` (`--runs 800` for a quick pass, `--json` for data). The shipped numbers and win rates are in the Stage 2 report; change `src/tuning.js`, rerun the sim, and `tests/sim.test.js` checks the result stays in a fair band.

Open questions for the next stage:

- Vesper "plays one hand ahead" when you are at 6 blood or less (a memory beat) is not built; the other memory lines are.
- Relic count: six is enough to feel the choice; a seventh that changes the dealer rather than you would be more interesting than another number.
- Special cards (hazards) and the map are still out.
- Sound: the effects are synthesized and short; real recorded foley would lift it, but not before the loop is settled.
