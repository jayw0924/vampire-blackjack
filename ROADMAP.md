# Lord Vesper's Table

Status file for every session in this project. Read this first. Update it last if you change direction.

Host path: `~/projects/personal/side-projects/vampire-blackjack`
Serve: `python3 -m http.server 8765 --bind 127.0.0.1` then open http://127.0.0.1:8765/
Tests: `node --test` from the project root.

## What this is

One-room vampire blackjack. Standard rules. The stake is blood. The dealer is Lord Vesper. Do not add a second currency, special playing cards, rites, a map, or a shop unless Jay asks in the current message.

## Locked rules

- Start 20 drops. Bet 2, 4, 6, 8, or 10. Blackjack pays 3:2. Dealer stands on soft 17.
- Win at 40. Drained below 2. Leave only before the deal.
- Hole card stays hidden during the player's turn. The page reads `publicView` only.
- Sound stays off until **Let the room speak**.

## Sessions

Sessions share files and do not share chat history. Do not edit the same file from two sessions at once.

| Session | Owns | Does not touch |
|---|---|---|
| Table | `src/game.js`, `src/rules.js`, `src/cards.js`, `tests/game.test.js`, `tests/rules.test.js` | `src/style.css`, `assets/` |
| Design and artwork | `index.html`, `src/style.css`, `src/ui.js`, `assets/` | `src/game.js`, `src/rules.js` |

## Design direction

Chosen direction: **One pool of light.** The window is the room. The oval sits low. Buttons are on the near rim. The arch is on the far rim.

Done:

- Felt, cornered cards, stake drops, vial, candle pool, door slit.
- Cellar no longer fades the cards.
- Portrait is `assets/lord.png` (moved from `GothicAristocratinChiaroscuro.png`). Face should sit above the cards; the coat may be covered by the felt. Crop has not been checked in a browser.

Still open for the design session:

- Confirm the portrait crop in a browser and shift `object-position` if the face is high or low.
- Gold stays on the name and the card back. Brass marks the felt and focus rings.
- No full-bleed castle painting. No CDN. No hotlinked images.
- Later, not now: a small frame shift when he drinks or pays. Not a sprite, not eye-glows.

## Portrait brief

If the portrait is replaced: one local still, chest up, dark background near `#14080c`, no text, no comedy fangs, no red eyes, no cape, no moon. Bottom fifth may be covered by the felt.
