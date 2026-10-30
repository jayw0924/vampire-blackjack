# Fonts

Self-hosted, no CDN. Both families are licensed under the SIL Open Font License 1.1 (full text beside each family).

| Family | Used for | Weights | License file |
|---|---|---|---|
| Cormorant Garamond (Copyright 2015 The Cormorant Project Authors) | names, the Lord's lines, card indices | 500, 500 italic, 600, 600 italic | `OFL-CormorantGaramond.txt` |
| IBM Plex Mono (Copyright 2017 IBM Corp., Reserved Font Name "Plex") | numbers, buttons, meters | 400, 500 | `OFL-IBMPlexMono.txt` |

Each file is a WOFF2 subset of the upstream "latin" files: Basic Latin and Latin-1 (U+0020-007E, U+00A0-00FF) plus a few typographic marks used in the copy (U+2013 U+2014 U+2018 U+2019 U+201C U+201D U+2022 U+2026 U+2212). The card suits are not in either family and fall back to the system font. Loaded with `font-display: swap`.
