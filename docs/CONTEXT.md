# TV4 demo context

Snapshot: 25/11/2026. The team repository `../Big-Data` is the source of truth for data, metrics and the contract. Official experiment results come from released package `tv2-20261124` and are copied into `public/official-results.json` by `scripts/export_official_results.py` after checksum verification.

## What is real

- The Experiments tab uses confirmed official E1–E5 metrics and configuration/runtime metadata from package `tv2-20261124`.
- The Dataset tab uses the TV2 supplementary tables and TV1 manifests for the weekly cuDF subsets, population, cleaning and split information.
- Six figures in `figures/` are generated from `public/official-results.json`; their sources and limitations are documented in `figures/CAPTIONS.md`.
- The official E1–E5 package contains run-level benchmark values. The delivered real E1 JSONL predictions and matching catalog are exported as a fixed 30-session sample in `public/demo-data.json`; the artifacts have no per-item scores.

## What is still pending

- TV1 product metadata (brand, category and price) remains pending. Product cards show original product IDs only.
- No score should be shown for a recommendation: the exported prediction records contain ranked IDs only.

## Interpretation rules

- E1 is the model comparison on the test partition. The package reports one run and seed, so results are descriptive and do not measure run-to-run variation.
- E3 is a validation comparison and is not directly comparable with E1/E2 test results.
- E4 preprocessing wall time includes its own read; do not add the standalone read time. The package also records a warm-cache condition.
- E5 composed time excludes shared first-seen and is not observed end-to-end wall time.
- Preserve package fields, units, nulls, limitations and source run IDs. Never invent or recompute metrics.

## Regeneration

Use the commands in the repository [README](../README.md) for official result and dataset adapters, real E1 sample generation and figure generation. The local `../tv4-real-bundle/` is an input only and must not be committed. See [DEMO_DAY.md](DEMO_DAY.md) for the live sequence and static offline fallback. See [TEAM_PROGRESS_CONTEXT.md](TEAM_PROGRESS_CONTEXT.md) for the fuller team status and upstream artifact locations.
