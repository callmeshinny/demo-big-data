# UI context: TV4 demo web

Snapshot: 26/11/2026. Describes local `main` after the E3/E4 rewording and the compact chart detail area. `origin/main` is at `5ecc80b`; later commits are local until the user pushes them. Read this before any UI change. Data rules live in `AGENTS.md` and `docs/CONTEXT.md`; this file covers the interface only. If they disagree, `AGENTS.md` wins.

## 1. What the site is

- **Static site, no backend.** React 18 + Vite 6, no server, no database, no API, no live model inference. Deployed as a Render Static Site (`npm ci && npm run build`, publish `dist/`) at https://demo-big-data.onrender.com/, auto-deployed from `main`.
- **Data flow.** Python scripts in `scripts/` read the team repo `../Big-Data` (read only) and `../tv4-real-bundle/` (outside Git) and write `public/*.json`. The browser fetches these JSON files at load time. Every number on screen comes from them.

| File | Used by | Content |
|---|---|---|
| `public/official-results.json` | Experiments, E1 strip | E1–E5 from package `tv2-20261124` (262 values, checked against `metrics.json`) |
| `public/dataset-overview.json` | Dataset | TV2 supplementary tables, raw audit, manifests |
| `public/demo-data.json` | Recommendations | Real E1 predictions: 30 of 1,337 test sessions, same sessions for Popularity/GRU/XLNet, ranked IDs only (no scores), catalog subset + full-catalog SHA |
| `public/sample-predictions.csv` | not used by the UI | Format sample (rule 9 exception in `AGENTS.md`) |

- Audience: lecturer and classmates in a 15-minute English talk + 5-minute Q&A. The demo walkthrough is about 3 minutes (`docs/DEMO_SCRIPT.md`). Default language English; Vietnamese via the EN/VI switch.

## 2. File map

| Area | Files |
|---|---|
| Entry, data loading, header | `src/main.jsx` |
| Header controls | `src/Nav.jsx` (`MainNav`, `LanguageSwitch`, `PresenterToggle`, `Popover`, `AboutDemo`) |
| Routing | `src/navigation.js` (`routeFromHash`, `experimentHref`) |
| Presenter mode | `src/presenter.js` (`readPresenter`, `savePresenter`, `PresenterContext`) |
| Tabs | `src/Recommendation.jsx`, `src/Dataset.jsx` (+ `DatasetContext.jsx`), `src/Experiments.jsx` |
| Charts | `src/Chart.jsx` (`BarChart`, `LineChart`, `useSelection`, `useWidth`), `src/chart-math.js` |
| Experiment views | `src/e1.js`, `src/scaling.js` (E2–E5), `src/takeaways.js` (E3/E4 takeaway wording chosen from the JSON values), `src/run-config.js`, `src/RunConfigDetails.jsx`, `src/interpretation-notes.js` |
| Shared UI | `src/ui.jsx` (`Notice`, `DataLoadFailure`, `InterpretationNote`, `DataKindBadge`, `StatusBadge`, `Issues`), `src/ProductCard.jsx`, `src/Glossary.jsx`, `src/EvaluationProtocol.jsx` |
| Data helpers | `src/data.js` (`normalizeDemo`, `firstAllModelHitSession`, `sessionContext`, `modelLabel`, `EXPERIMENTS`) |
| Formatting | `src/format.js` (the only formatter) |
| Text | `src/i18n.js` (`messages.en` / `messages.vi`, `t(key, ...args)` with `{0}` placeholders) |
| Styles | `src/styles.css` (all tokens and components) |

## 3. Design system (Apple HIG-inspired, no Apple logos, trademarks or bundled SF Pro)

**Tokens** (`src/styles.css` `:root`; dark via `prefers-color-scheme: dark`; high contrast via `prefers-contrast: more` and `forced-colors`):

| Token | Light | Dark | Meaning |
|---|---|---|---|
| `--bg` / `--surface` | `#f5f5f7` / `#ffffff` | `#000000` / `#1c1c1e` | page / cards |
| `--label` / `--label-2` | `#1d1d1f` / `#6e6e73` | `#f5f5f7` / `#a1a1a6` | primary / secondary text |
| `--accent` | `#0066cc` | `#2997ff` | interactive only |
| `--control-border` | `#86868b` | `#8e8e93` | control borders (≥ 3:1) |
| `--positive`, `--positive-text`, `--positive-bg` | `#248a3d`, `#1a7f37`, `#edf8f0` | `#30d158`, `#30d158`, `#0e2a16` | Hit only |
| `--on-positive` | `#ffffff` | `#000000` | ✓ glyph on the green Hit badge (≥ 3:1) |
| `--selected-bg` | `#eef5fc` | `#1d2835` | selected table column (`--label-2` on it ≥ 4.5:1) |
| `--danger`, `--danger-bg` | `#d70015`, `#fdeceb` | `#ff453a`, `#3b1210` | problems only |
| `--caution` | `#a15c00` | `#ffb340` | warnings |
| `--model-popularity/-gru/-xlnet` | `#5e7387` / `#c4610a` / `#8e44ad` | `#9fb4c7` / `#ff9f0a` / `#bf5af2` | fixed model colours |
| `--glass` | `rgba(255,255,255,.72)` | `rgba(28,28,30,.72)` | translucent surfaces |

**Type scale: exactly 5 steps.** `--t-title` 28, `--t-section` 22, `--t-lead` 18, `--t-body` / `--t-table` 16, `--t-footnote` 13 (chart ticks, captions, footnotes, column sub-labels only). Body text is not italic. Paragraphs are at most about 3 lines in the default view. Tabular numerals in tables, metrics and chart labels. Product IDs use `--mono`.

**Layout.** 8-pt spacing (`--s1`…`--s6` = 4–32 px), card radius 14 px, control radius 10 px, controls and every clickable target ≥ 44 px (`--control-height`), sticky header 56 px, content ≤ 1200 px.

**Colour rules (one colour, one meaning).**
- Accent blue is for interactive elements only.
- Green means Hit. Hit text uses `--positive-text`. The ✓ glyph uses `--on-positive` (white in light mode, black in dark mode).
- A miss is neutral: grey text, ✕, and the word "Miss". Never red.
- Red is for load errors, failed or excluded runs, and config "Differs".
- "In history" is a neutral grey outline.
- Model colours always appear next to a text label or marker shape (● Popularity, ■ GRU, ◆ XLNet). Never rely on colour alone.

**Selective translucency (`.glass`).** `backdrop-filter: saturate(180%) blur(20px)`. Used only on the sticky header, the control bars and segmented sub-tabs, chart tooltips, glossary/About popovers and the Method details panel. Never on data cards, tables or chart plot areas. It falls back to solid `--surface` when there is no `backdrop-filter` support, when reduced transparency, high contrast or forced colours are on, and in presenter mode. Only `--label` text may sit on glass. The page has a faint `--bg-tint` gradient so the glass is visible.

## 4. Screens and behaviour

**Header (glass).**
- Title. It never truncates (no ellipsis). Between 1101 and 1279 px it shows the short label "Next-Item Demo" / "Demo gợi ý".
- `<nav>` links with `aria-current`.
- An About popover, the Presenter mode switch, and the EN/VI segmented switch (remembered in `localStorage`).

**Routes.** `#recommendation`, `#dataset`, `#experiments/e1`…`#experiments/e5`, and `#experiments/e2/N` to preselect a data-size level. Legacy `#data` and `#experiments-e3` still resolve. `?session=<id>` preselects a session. `?present=1` / `?present=0` sets presenter mode. Anchors use `scroll-margin-top` so the header does not cover them.

**Recommendations tab** (order matters; the reviewer asked for it):
1. Title, one intro sentence, and one badge ("Real E1 predictions · Showing 30 of 1,337 sessions").
2. Glass control bar: Model segmented control, Session select, and a presenter tip "Try session X: hit for all 3 models". X is computed by `firstAllModelHitSession` and is 21546 with the current data. Never hard-code it.
3. Interaction history next to the Actual next item, plus the sentence "Hit — the actual item is ranked N of 20" or "Miss — the actual item is not in the Top-20".
4. The Top-20 table. The hit row and the Actual panel highlight each other. The Score column is absent because no model exports scores.
5. The E1 strip for the selected model, linking to E1.
6. Closed "Method details & sources": protocol, run ID, checksums, file names, catalog size.

Acceptance: at 1280×800, in EN and VI, steps 3 and the Hit/Miss sentence are visible without scrolling.

**Dataset tab.** Raw month facts, why this subset, 5V summary, weekly cuDF subsets (N% links to E2), caveats, representativeness limits, split population, session length, processing pipeline. Never claim that hash sampling guarantees representativeness.

**Experiments tab.**
- A segmented sub-nav with subtitles: E1 Model comparison, E2 Data size, E3 Training batch size, E4 Storage format, E5 Scalability.
- Each panel contains: title, subtitle, (E3/E4) a course-item line in `--label-2`, one takeaway sentence (an i18n template filled from JSON, with no numeric literals), charts, a metric × run table whose columns link to the chart marks, one notes block, and a closed "Configuration & sources".
- The Environment card is at the bottom and collapsed.
- Per-experiment rules:
  - **E3 · Training batch size (GRU).** Course item 3 asks to vary compute resources; the hardware was fixed (one AWS VM, one Tesla T4) and only the GRU training batch changed (32 vs 128, read from JSON), on validation. Never claim CPU, RAM or workers were varied. Validation badge, train-batch headers read from configs, a hardware/limitation note (hardware names read from `vm_environment`), the held-constant note. Charts: training time, sampled GPU process memory, validation Recall@20. No throughput (the package has no throughput field) and no "peak" CUDA memory (it is sampled).
  - **E4 · Storage and retrieval: CSV vs Parquet.** Course item 4. The same events stored both ways: file size (MiB, raw bytes in the tooltip), read time, and preprocessing time (which already includes the read). One chart for each.
  - **Takeaway wording (E3/E4).** `src/takeaways.js` picks every comparison word (faster/slower, more/less, lower/higher, smaller/larger and the VI equivalents) by comparing the JSON values; equal or missing values give a neutral sentence that only lists the values. E4 says "similar" only if the preprocessing times differ by < 10% of the larger, and adds "because reading is only a small part of it" only if each read is < 10% of its preprocessing time.
  - E5 Bottleneck values are mapped to readable i18n labels, with the raw value in the title attribute.
  - E5 links only to the same E2 level. Nothing links E3 beside E1/E2.

**Charts** (hand-written SVG; no chart library).
- Hover previews a mark. Click, Enter or Space selects it and dims the others. Esc or "Clear selection" clears it. Arrow keys move between marks.
- Hit areas are ≥ 44 px, baselines are at zero, and `prefers-reduced-motion` is respected.
- The tooltip shows the display value, raw value, unit, run ID and source file.
- Category labels are never truncated (no ellipsis): measured in the page font, wrapped to two lines, then reduced to the 13 px caption size, then staggered.
- **Fixed detail area under every chart.** The hint ("Select a bar or point for details" / "Chọn một cột hoặc điểm để xem chi tiết", `--label-2`, vertically centred) and every mark's details share one grid cell, so the area is always as tall as the tallest content and hovering or selecting never changes the card height. When the chart card is ≥ 440 px the details are two columns of label: value pairs (about two lines).
- Tooltip placement: on screens ≥ 900 px a floating glass tooltip sits above or beside the mark when it fits without covering the selected mark or any value, category or axis label; otherwise (middle bars, and always below 900 px) the details show in the fixed area.
- Desktop bar charts are 290 px tall; E3 and E4 show three charts per row from 1100 px.
- Never plot a series that is not in the JSON.

**Glossary ⓘ.** Session, History (prefix), Top-20, Hit, Recall@20, NDCG@20, Validation vs test. Keyboard and touch accessible; Esc closes the popover and returns focus. Definitions follow `docs/data_contract.md` and the team's model protocol. Never invent a definition.

**Presenter mode.** Body and tables 18 px, footnotes 16 px, chart labels 16 px, larger section spacing, solid header, notes collapsed. Never shrink text to make content fit; let the page scroll.

**Errors and empty states.** A friendly `DataLoadFailure` with technical details collapsed. Missing values show "Not available yet" / "Chưa có". Inapplicable values show "Not applicable" / "Không áp dụng". Never show NaN, undefined, null or 0 for a missing value.

## 5. Number display (`src/format.js` only)

- Recall/NDCG: 4 decimals.
- Times: 3 significant digits, with the unit in the row or column header.
- Bytes: MiB/GiB with 1 decimal and the unit shown.
- Integers: grouped with thousands separators.
- Missing or NaN: the "Not available yet" text.
- The raw value always goes in the tooltip or title attribute.
- Never recompute or redefine a metric, and never derive a score from a rank. Display rounding is the only change allowed.

## 6. Rules for any UI change

1. All visible text goes through `src/i18n.js` with both `en` and `vi`. No raw keys on screen. No English left in VI mode, except technical terms that the team keeps in English (for example "Fit workflow").
2. Use the tokens. Never hard-code a colour, size or radius in a component.
3. Contrast: text ≥ 4.5:1, large text and control borders ≥ 3:1, the high-contrast set ≥ 7:1 where feasible, and text on glass checked against the worst case. Add every new colour pair to `tests/contrast.test.js`.
4. Keep the Recommendation order and the fold acceptance from section 4.
5. Never put E3 next to E1/E2. Keep planned and actual configuration separate. Keep the interpretation notes.
6. No new dependency unless it is justified in the report. The JS bundle is about 290 kB.
7. Every `public/*.json` stays under 300 KB. Never commit the bundle, the catalog, Parquet or checkpoints.

## 7. Checks (run from `tv4-demo-web/`)

```bash
npm test                 # node unit + SSR render tests (incl. contrast, i18n parity, format)
npm run build
npm run test:e2e         # scripts/check_ui.mjs on the production build: text scan, overflow,
                         # chart select/keyboard/table link, tooltip in 375 px, hit link,
                         # glossary, presenter, fold at 1280x800, header <= 56 px,
                         # header title, 44 px targets, tooltip overlap, no ellipsis in
                         # chart labels, chart card height stable on hover/select
PYTHONPATH=../Big-Data:scripts python3 -m unittest discover -s tests -p "test_*.py"
                         # BIG_DATA_ROOT overrides ../Big-Data
python3 scripts/check_demo_script.py
                         # talk-track length, required Q&A, every decimal = a displayed JSON value
git diff --check
```

Counts at this snapshot: `npm test` 85/85, `npm run test:e2e` 43/43, Python 25/25 (official values 262/262), demo script 402 English walkthrough words. JS bundle 290 kB (gzip 90 kB).

After these pass, look at the screenshots yourself (`scripts/capture_screens.mjs`; save outside the repo, e.g. `/tmp/...`). Automated checks have missed overlap, clipped labels and raw i18n keys before. Check widths 1440, 1280×800, 768 and 375, in EN and VI, in light, dark and high contrast, with presenter mode on and off.

## 8. Known gaps and open decisions

- Commits after `5ecc80b` (this file, the fixed chart detail area, the E3/E4 rewording, stale-label cleanup, the compact detail area, the E3/E4 talk lines) are local until the user pushes `main`.
- Forced-colors mode is not verifiable in headless Chrome. Check it manually on the presentation laptop.
- Product metadata (brand/category/price) is pending from TV3/TV1, so cards show original product IDs only.
- E3 does not vary CPU, RAM or workers (one VM, one GPU); varying them is listed as future work in `docs/DEMO_SCRIPT.md`.
- Still open for the user to decide ("the site feels too academic"): an Overview tab (problem → what we did → what we found), a Simple/Detailed switch merged with presenter mode, plain-language headings such as "E2 · Does more data help?", and Recall shown as "% of sessions" (the raw value stays in the tooltip; confirm with TV2).
