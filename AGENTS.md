# AGENTS.md — TV4 demo web

Instructions for any coding agent (Codex, Claude Code, etc.) working in this repo. Read this file and `docs/CONTEXT.md` before every task.

## 1. What this repo is

This is a standalone repo for the **web demo** of the Big Data group project (session-based next-item recommendation). It is a personal working repo owned by TV4. It exists so that:

- UI work does not create commit noise in the team repo;
- the demo can be built and deployed (Render, AWS) independently.

The team repo `tlmthuy/Big-Data` stays the **source of truth** for data, models, metrics and the data contract. This repo only **displays** artifacts that the team has delivered.

## 2. Scope

**In scope**
- React + Vite UI in `src/`.
- Adapter scripts in `scripts/` that convert delivered artifacts into the JSON files in `public/`.
- Layout, field tables, missing-data states, loading/error states, responsive design.
- Build and deploy config (Render static site, AWS S3/CloudFront or Amplify).

**Out of scope — never do these**
- Training, fitting a workflow, or running benchmarks.
- Writing the report, slides, or team documentation.
- Editing anything in the team repo from here.

## 3. Hard rules (data integrity)

1. **Never invent numbers.** A missing value is `null` in JSON and **"Chưa có"** in the UI. Never use `0` unless an artifact actually reports zero.
2. **Never derive a score from rank or position.** Show a score only when TV2 has exported it.
3. **Never recompute or redefine a metric.** Display metrics exactly as TV2 delivers them, with unit and measurement scope.
4. **Keep planned configuration separate from measured results.** Use two columns: **Dự kiến** (from the experiment matrix) and **Thực tế** (from run artifacts). If they differ, flag the difference and never hide either value.
5. **Label toy data.** Any data with `data_kind = "toy"` shows a visible toy badge and is never presented as a benchmark result.
6. **Keep artifact order** for recommendations. Items already in the history may be recommended. Technical IDs (padding, null, OOV, mask) are never shown.
7. **Always show original product IDs** (`p3`), never encoded IDs (`3`), using the run's own catalog.
8. **Always show the history and the actual next item**, even when a model has no prediction. Only the recommendation area shows "Chưa có".
9. **No large data in Git.** Commit only small JSON files for the UI. Never commit CSV, Parquet, checkpoints, raw logs or secrets.
10. When the data contract and this repo disagree, the contract in the team repo wins. Report the mismatch; do not silently change the shape.

## 4. Layout

```
.
├── AGENTS.md              # this file
├── docs/
│   ├── CONTEXT.md         # project background, team, artifacts, dependencies
│   ├── data_contract.md   # copy of app/output_contract.md from the team repo (pinned commit)
│   ├── SYNC.md            # how to pull data from / push UI back to the team repo
│   └── upstream_TODO.md   # UI review findings carried over from the team repo
│   ├── CONTRACT_NOTES.md  # where this repo extends the contract; report these to TV2
├── public/
│   ├── demo-data.json     # Part A: session predictions, { runs: [...] } (toy for now)
│   └── run-results.json   # Part B: E1–E5 records, planned + toy smoke (no official package yet)
├── scripts/
│   ├── export_demo_data.py    # Part A adapter (needs a Big-Data clone, see SYNC.md)
│   └── export_run_results.py  # Part B adapter
├── src/
│   ├── main.jsx           # app shell, tabs, data loading
│   ├── data.js            # validation + formatting (pure JS, tested)
│   ├── Recommendation.jsx # Part A view
│   ├── Experiments.jsx    # Part B view (E1–E5)
│   ├── ui.jsx             # badges, notices
│   └── styles.css
├── tests/
│   ├── data.test.js       # node --test
│   └── fixtures/          # empty / malformed / missing-field files for tests and browser checks
├── index.html
└── package.json
```

## 5. Commands

```bash
npm ci            # install
npm run dev       # local dev server
npm run build     # production build into dist/
npm run preview   # serve dist/ locally
npm test          # validator tests (node --test)
```

Regenerate both JSON files (requires a local clone of `tlmthuy/Big-Data`, see `docs/SYNC.md`):

```bash
cd ../Big-Data
C=evaluation/tests/fixtures/catalog.json
S=metrics/tv2-config-collector-smoke
PYTHONPATH=. python3 ../tv4-demo-web/scripts/export_demo_data.py \
  --run metrics/tv2-toy-day1=$C \
  --run $S/smoke-e1-popularity-010=$C --run $S/smoke-e1-gru-010=$C --run $S/smoke-e1-xlnet-010=$C \
  --run $S/smoke-e3-gru-010-b32=$C --run $S/smoke-e3-gru-010-b128=$C \
  --output ../tv4-demo-web/public/demo-data.json
python3 ../tv4-demo-web/scripts/export_run_results.py \
  --matrix configs/experiments.json --collector-dir $S \
  --output ../tv4-demo-web/public/run-results.json
```

Test broken data in the browser (dev server only): `/?demo=/tests/fixtures/malformed.json`, `/?results=/tests/fixtures/bad-results.json#experiments`.

## 6. Definition of done for any UI change

- `npm run build` and `npm test` pass.
- Check in a browser:
  - sessions `rank1`, `rank20`, `miss`;
  - switch model and switch back;
  - an empty or malformed JSON file;
  - a narrow screen.
- No hard-coded numbers in `src/`. Every number shown comes from a JSON file in `public/`.
- Missing values show **"Chưa có"**, and toy data shows the toy badge.
- Commit messages are short and describe the change. Do not push unless the user asks.

## 7. Deployment

The build is a static site (`dist/`) with no backend.

- **Render (Static Site):**
  - build command: `npm ci && npm run build`;
  - publish directory: `dist`.
- **AWS:**
  - S3 + CloudFront: upload `dist/` to the bucket.
  - Amplify: same build command, artifact directory `dist`.

A live inference backend (FastAPI) is **not** planned unless TV2/TV3 agree. If one is added later, it reads delivered checkpoints only and never trains inside a request.
