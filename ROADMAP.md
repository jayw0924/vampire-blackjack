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

- The hole card never reaches the page early. The page reads `publicView` only. The staged dealer turn replays what the settled view already shows; it never reads the hidden card.
- Sound stays off until the player turns on **Sound**.
- No CDN. No hotlinked images. Fonts, if added, are self-hosted.
- Game framing only. The stake is blood. No cash-out, no real-money wording, no odds-and-payout marketing.
- The 39 original tests stay green. New rules get new tests.

## Locked rules (the blackjack core)

- Start 20 drops. Bet 2, 4, 6, 8, or 10. Blackjack pays 3:2. Dealer stands on soft 17.
- Win at 40. Drained below 2. Leave only before the deal. These are the single-evening rules. The run layer will wrap them (quota, hand limit) without changing them. The tuning numbers in the direction doc (8 hands, quota 40, Bite at 2 blood) are starting proposals to be tuned by simulation, not decisions.
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
- The door is an opening in the stone. It narrows when the parlor draws in, drops with a blood thread in the cellar, and moves left on departure.
- One pool, driven by candle count, can go out. It is not a fade on the cards or the felt.
- Portrait is `assets/lord.png` (1024×1536). `object-position` is `center 8%`. In the arch (168×224 on desktop at most, 120×160 on a phone) it trims coat, not face; checked in a browser.

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

Still to come, in order: the run layer, the dawn clock and hunger tax, Bite, relics, three floors with bosses (Steward, Lamia, Vesper), Vesper reactions with memory, more juice, and a localStorage best floor.
