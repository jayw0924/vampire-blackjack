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

- Felt has a wood rail and a brass hairline. Cards have a bottom edge. Faces stay cream.
- The night outside the parlor is `#050203`. The name is a gold plaque. Blood sits with the vial.
- The door is an opening in the stone. It narrows when the parlor draws in, drops with a blood thread in the cellar, and moves left on departure.
- One pool, driven by candle count, can go out. It is not a fade on the cards or the felt.
- Portrait is `assets/lord.png` (1024×1536). `object-position` is still `center 8%`. Cover in the 186×248 arch should trim coat, not face. That has not been checked in a browser.

Still open for the design session:

- Open the page and confirm the crop, the door, and whether the arch still reads as a box. Add stone blocks only if it does.
- Gold stays on the name and the card back. Brass marks the felt, the focus rings, and the frame.
- No full-bleed castle painting. No CDN. No hotlinked images.
- Later, not now: a small frame shift when he drinks or pays. Not a sprite, not eye-glows. A pulse swell in `src/score.js` is not this session's file.

## Portrait brief

If the portrait is replaced: one local still, chest up, dark background near `#14080c`, no text, no comedy fangs, no red eyes, no cape, no moon. Bottom fifth may be covered by the felt.
