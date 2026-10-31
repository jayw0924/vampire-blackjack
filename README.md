# Vigil

Blackjack at Lord Vesper's private table in the Crimson Parlor. The dealer is Lord Vesper. The stake is your blood.

You start with 20 drops. Bet 2, 4, 6, 8, or 10. Ordinary wins pay even money. A natural pays 3 to 2. The dealer stands on 17, including soft 17. You may double on your first two cards, and split once. You may not double after a split, resplit, or take insurance.

A run is three floors: The Steward, The Lamia, Lord Vesper. Each floor gives you a number of hands before dawn (the candles beside the arch burn down, one per hand), takes a little blood for hunger as the hands go, and opens the stair when your blood reaches the quota. Below 2 drops the evening ends in the cellar. You may leave on your own before the deal.

You may Bite once a hand: pay one drop, draw one more card, then keep it or burn it. Relics, six of them, sit on the table's near rim; you choose one at the start and another each time you take the stair. Press and hold a token to read it; tap to use the Silver Mirror.

Each dealer changes one rule. The Lamia deals face up and charges a drop for every Hit. Lord Vesper stands on 18, and ties go to the house (a push is a loss). They remember what you did.

The room changes with your blood. The dealer remarks on the hand he can see, never the hole card. The room is silent until you switch Sound on. Your deepest floor is kept in this browser (Settings has a way to forget it).

The table is a felt oval in a stone parlor. Art is local, listed in `assets/art/manifest.json`. Do not hotlink an image.

## Keys

H hit, S stand, D double, B bite, K keep, X burn, M the Silver Mirror, 1 2 3 choose a relic, + and - raise and lower the stake. Space deals, moves to the next hand, or begins another evening.

## Run

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765/. Do not open `index.html` as a file; the module script will not load.

## Test

```bash
node --test
node tools/sim.mjs          # balance simulation: win rates per floor
```

For a repeatable table, `?seed=7` works anywhere. The other parameters (floor, blood, relics, hands, quota) are debug-only: they work on localhost or with `?debug=1`, and such a rehearsal table never reads or writes the saved record. Example: `?seed=7&floor=3&blood=44&relics=tithe,lantern&hands=4&quota=30`.
