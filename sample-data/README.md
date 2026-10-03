# Sample data

This is a fictional but realistic six-season crabbing log for the San Juan Islands, built for testing Crabby. None of it is real catch data.

| File | Use |
|---|---|
| `crabby-sample-backup.json` | **Upload this one.** In the app, open **Backup**, then **Restore from backup…** |
| `crabby-sample-visits.csv` | The same visits as a spreadsheet, for reading. (CSV import comes in phase 4.) |

**Load it in a separate browser or a private window, not on the phone she logs real catches on.** Restoring adds these entries to whatever is already on the device, and the app can't yet bulk-delete them. Every sample record has an id starting `sample-`, so they can be cleaned out later if needed.

## What's in it

17 spots and 252 visits across 147 days on the water, July 2021 to October 2, 2026.

| Season | Visits | Days | Keepers | Throwbacks |
|---|---|---|---|---|
| 2021 | 37 | 23 | 73 | 419 |
| 2022 | 31 | 18 | 95 | 307 |
| 2023 | 51 | 28 | 202 | 493 |
| 2024 | 46 | 26 | 146 | 482 |
| 2025 | 49 | 28 | 177 | 489 |
| 2026 | 38 | 24 | 203 | 394 |

## How it was made realistic

It follows the rules and rhythms of WDFW Marine Area 7:

- **Seasons:** summer runs from a mid-July Thursday to September 30, open Thursday–Monday only. Winter trips run October–December. 2026 has two trips on the October 1–2 winter opener.
- **Limits:**
  - Usually two licensed crabbers aboard, sometimes one. Each person can keep 5 Dungeness and 6 red rock a day.
  - Each person can fish 2 pots, so 4 pots a day are split across 1–3 spots.
  - No day goes over the limit. Once they limit out, any further legal crabs are released and counted as throwbacks, and the note says "Limited out".
- **Within a season:** catches are best at the July opener and taper off as the season is fished down. Soft-shell crabs, which are thrown back, peak in late August and September.
- **Between seasons:** 2022 was a lean year and 2023 a strong one. 2021 has low keeper totals because she was still trying out spots, including the poor ones.
- **Her habits:**
  - Early on she spread trips across many spots; later she sticks to favorites.
  - She found Nelson Bay in 2024 and it quickly became a favorite.
  - She recorded pots on most visits, but less consistently in 2021–22.
  - Times are pulls from about 9 AM into early afternoon, Pacific time.
- **Notes** are attached to about 60% of visits. They cover bait, soak time, wind and fog, softshells, females and short crabs, starfish, seals, and the Dungeness/red-rock split. A few mention a lost pot (cut buoy line) or pots dragging in the current.

## Patterns planted for testing

| Feature to test | What to look for |
|---|---|
| Map colors | Blue pins (good) on the west side of San Juan Island (Westcott, Garrison, Nelson, Mitchell Bay) and in Griffin Bay. Red and orange pins (poor) around Friday Harbor (Brown Island, Point Caution). |
| Spatial analysis (phase 6) | A hot cluster on the west side and in Griffin Bay, and a cold cluster around Friday Harbor. **Mosquito Pass** is a poor spot (strong current) in the middle of the hot cluster, so the analysis should flag it as an outlier. |
| Season and month filters | Ratings and catches are higher in July than in September. 2022 is visibly weaker than 2023. |
| Spot page charts | The Westcott Bay "Season by season" chart shows the 2022 dip. Pick any single season to see the decline after the opener. |
| Merge spots | **"Westcot bay"** is a duplicate of Westcott Bay: two 2022 visits logged under a misspelled name with a GPS fix about 40 m off. Open Westcott Bay, choose Edit, then merge "Westcot bay" in. |
| Small samples | Spots with one or two visits (Shoal Bay, East Sound, Blind Bay) can top or bottom the "This season" list on a single lucky or bad day. That's a good reminder of why the spatial analysis gives less weight to spots with few visits. |
| Missing values | 28 visits have no pot count, so "kept per pot" uses only the visits that have one. |

## Regenerating

```sh
node scripts/generate-sample-data.mjs
```

The output is deterministic, so the same script always produces the same files. To change the story, edit the spot table, season dates or year multipliers at the top of the script.

Spot coordinates are approximate and chosen to sit in the water at each named place. Check them against a chart before treating any of them as real.
