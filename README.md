# Lord Vesper's Table

Blackjack at a private table in the Crimson Parlor. The dealer is Lord Vesper. The stake is your blood.

You start with 20 drops. Bet 2, 4, 6, 8, or 10. Ordinary wins pay even money. A natural pays 3 to 2. The dealer stands on 17, including soft 17. You may double on your first two cards, and split once. You may not double after a split, resplit, or take insurance.

At 40 drops, the Lord sends you out. Below 2, the evening ends in the cellar. You may leave on your own before the deal.

## Run

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765/. Do not open `index.html` as a file; the module script will not load.

## Test

```bash
node --test
```
