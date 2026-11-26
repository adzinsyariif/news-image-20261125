# The World Today — Wednesday, 25 November 2026

[![Bounty](https://make.fun/badge/news-image-20261125.svg)](https://make.fun/bounty/news-image-20261125)
[![Rank](https://make.fun/badge/news-image-20261125/adzinsyariif/news-image-20261125/rank.svg)](https://make.fun/bounty/news-image-20261125)
[![Reward](https://make.fun/badge/news-image-20261125/adzinsyariif/news-image-20261125/reward.svg)](https://make.fun/bounty/news-image-20261125)

One 1024×1024 broadsheet summing up Wednesday 25 November 2026: 49 verified
stories across 8 regions, a lead Gulf-crisis banner, a day timeline, a markets
ticker and day-move chart, a world locator map, and a sport results strip.

## Layout

- `entry.png` — the rendered front page (1024×1024 PNG).
- `stories.json` — the day's verified stories, market closes, timeline moments.
- `render.mjs` — builds the page HTML from `stories.json` and screenshots it
  with headless Chrome (`node render.mjs`).
- `main.ts` — copies `entry.png` to `MAKEFUN_OUTPUT_DIR` (default `/output`).

## Run

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see `LICENSE`.
