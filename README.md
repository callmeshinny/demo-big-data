# TV4 demo web — Session-based recommendation

Standalone demo for the Big Data group project (`tlmthuy/Big-Data`). It shows a waiting state for real Top-20 per-session predictions and official E1–E5 experiment results from package `tv2-20261124`.

The static demo has Recommendations, Dataset, and Experiments tabs. English is the default, with a Vietnamese toggle in the header. Toy prediction examples are kept separate from official metrics.

## Branding

Add either or both images to `src/branding/` using these exact filenames.

| Image | Path | Where it appears |
| --- | --- | --- |
| Logo | `src/branding/logo.png` | In the header, above the tab bar |
| Cover | `src/branding/cover.jpg` | Full-width banner below the header |

Each image appears automatically on the next build. See the [branding guide](src/branding/README.md) for dimensions, file-size limits, and image sourcing. To change the site name, update `site_name` for both languages in `src/i18n.js` and set the English `<title>` in `index.html`.

```bash
npm ci
npm run dev     # local
npm run build   # static build in dist/
npm test        # data validation tests
```

## Official data adapters

The source of truth is the adjacent, read-only `../Big-Data` clone. Regenerate the official results JSON from the released package with checksum verification:

```bash
python3 scripts/export_official_results.py \
  --package ../Big-Data/metrics/releases/tv2-20261124
```

Regenerate the dataset overview from the team checkout (the adapter reads its current directory):

```bash
cd ../Big-Data
python3 ../tv4-demo-web/scripts/export_dataset_overview.py \
  --output ../tv4-demo-web/public/dataset-overview.json
cd -
```

Regenerate the official figures from the resulting JSON:

```bash
python3 scripts/make_figures.py
```

The recommendation adapter (`scripts/export_demo_data.py`) is separate and should only be run when the real prediction bundle is delivered. See [docs/DEMO_DAY.md](docs/DEMO_DAY.md) for presentation and offline fallback steps.

- Agent instructions: [AGENTS.md](AGENTS.md)
- Project context: [docs/CONTEXT.md](docs/CONTEXT.md)
- Data contract: [docs/data_contract.md](docs/data_contract.md)
- Contract extensions to report to TV2: [docs/CONTRACT_NOTES.md](docs/CONTRACT_NOTES.md)
- Syncing with the team repo: [docs/SYNC.md](docs/SYNC.md)
