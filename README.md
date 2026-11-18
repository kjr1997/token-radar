# Token Radar — token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/kjr1997/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/kjr1997/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar: it reads a sealed DefiLlama snapshot of 758 protocols,
ranks every rankable pre-token protocol by an implied value, and hands in a
dashboard a reader can use — board, detail view per protocol, filter, and a
farm plan with a cost and a time on every step.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

`main.ts` (Node 22+, standard library only) writes `out/board.json`,
`out/data.js`, copies `dashboard/` and `screenshots/` to `out/`, and writes
`out/dossier.json` with `buildDossier` from `vendor/makefun-board.ts`.

## The model (`lib/model.ts`, `impliedValue`)

```
implied = TVL × 0.25 × growth × maturity × chains
  growth   = 1 + clamp(7-day change, −50%, +150%) × 0.6
  maturity = 0.6 + min(age in days, 1095) / 1095 × 0.4   (unknown age: 365 days)
  chains   = 1 + 0.03 × min(chain count, 6)
```

Only the snapshot's own figures go in: TVL, 7-day growth, how long the
protocol has run with no token recorded, and how many chains it is on. No
protocol name is special-cased. The board covers all 40 watchlist protocols
plus every other rankable pre-token protocol in the snapshot (198 rows);
protocols whose token already trades are set apart in the Live tab at the
market's own value, never mixed into the ranking.

“Pre-token” means the snapshot records no token for the protocol — no market
cap, no CoinGecko id, no symbol. That is the record, not proof it has none.
An implied value is this radar's own claim, not a prediction that a token
will be issued, or when.

## The dashboard (`dashboard/`)

Static, no network, no framework: `index.html` + `app.css` + `app.js` read
`data.js` (the same board `board.json` holds). Sortable columns, search,
category / chain / scope filters (All / Watchlist / Early), a Live tokens
tab, and a detail view per protocol with the model breakdown and six farm
steps. Hash routes: `#detail=<slug>`, `#filter=watchlist`, `#tab=live`.

## Screenshots (`screenshots/`)

Three JPEGs rendered from this dashboard with headless Chromium (Playwright):
`1-board.jpg` the board, `2-detail.jpg` a protocol's detail view,
`3-filtered.jpg` the watchlist filter. Each 1440×900, 300–350 KB.

## License

MIT — see `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=151n8e75&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
