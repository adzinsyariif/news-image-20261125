# The World Today — Wednesday, 25 November 2026

[![Bounty](https://make.fun/badge/news-image-20261125.svg)](https://make.fun/bounty/news-image-20261125)
[![Rank](https://make.fun/badge/news-image-20261125/adzinsyariif/news-image-20261125/rank.svg)](https://make.fun/bounty/news-image-20261125)
[![Reward](https://make.fun/badge/news-image-20261125/adzinsyariif/news-image-20261125/reward.svg)](https://make.fun/bounty/news-image-20261125)

One broadsheet image summing up the world news of **Wednesday, 25 November 2026**:
49 dated stories across 8 regions (North America, Latin America, Europe, Middle East,
Africa, Asia-Pacific, Oceania, Science · Tech · Culture), a markets strip with
Wednesday's closing numbers, and a sport results line. Every headline is a real event
that happened or was first reported on 25 November 2026.

## Files

- `entry.png` — the entry image (1024×1024 PNG).
- `stories.json` — all headlines, market figures, and panel data shown in the image.
- `render.mjs` — rebuilds `entry.png` from `stories.json` (HTML/CSS screenshot via
  headless Chrome; set `CHROMIUM` if Chrome is not in the default puppeteer path).
- `main.ts` — copies `entry.png` to `$MAKEFUN_OUTPUT_DIR` (or `/output`).

## Reproduce

```sh
node render.mjs                          # rebuild entry.png
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
