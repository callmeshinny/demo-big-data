# Demo day runbook

## Before presenting

1. Confirm the demo branch is checked out and the official results file is present: `public/official-results.json` (`tv2-20261124`).
2. Build and check the site:

   ```bash
   npm test
   npm run build
   ```

3. For the hosted demo, open [https://demo-big-data.onrender.com/](https://demo-big-data.onrender.com/) and confirm the page loads. For a local demo, start Vite with `npm run dev`.
4. Open Recommendations, Dataset and Experiments E1–E5 once from the segmented control at the top. Confirm the real E1 badge, 30/1,337 hash-sample note, and three enabled model choices. The page follows the system light or dark appearance.

## Live three-minute walkthrough

1. **Dataset:** explain session-based next-item prediction and the weekly cuDF subsets. Point out the official population, cleaning and split tables.
2. **Experiments → E1 · Models:** show Recall@20 and NDCG@20 across Popularity, GRU and XLNet. Say that this is one run and seed.
3. **E3 · Batch size:** explain the validation batch-size tradeoff. Point out the validation note and avoid comparing it directly with E1/E2 test.
4. **E4 · CSV vs Parquet:** compare file size and read time, then preprocessing wall time. Mention warm-cache conditions and that preprocessing already includes reading.
5. **E5 · Scalability:** show composed time and seconds per million events against event count; units are in the axis titles. State that the composed metric excludes shared first-seen and is not observed end-to-end wall time.
6. **Recommendations:** choose a real session, show its interactions, actual next item, hit rank or miss, and the model’s ordered Top-20. On a hit, the target row and the Actual next item panel share a green bar and read “Hit at rank N”. For a hit with every model, use the session named in the presenter tip inside “Method details & sources” (computed from the data). Explain that the fixed seed-1 sample is outcome-independent and that official E1 scores are not recomputed on this sample. Models export ranked IDs only, so the Top-20 has no Score column; the page replays saved outputs and never retrains or runs live inference.

Use [DEMO_SCRIPT.md](DEMO_SCRIPT.md) for the bilingual talk track and Q&A. Read detailed values from the screen so labels, units and source IDs remain visible.

## Fallback without network access

1. Before the event, generate the static site and screenshots:

   ```bash
   npm run build
   node scripts/capture_screens.mjs
   ```

2. Start the local production preview:

   ```bash
   npm run preview
   ```

3. Open the local preview URL in the browser. The built site is static and uses the JSON files shipped in `public/`.
4. If the preview browser is unavailable, present screenshots from `screenshots/en/` or `screenshots/vi/` at 1280 px or 375 px. Choose `recommendation`, `recommendation-hit`, `recommendation-miss`, `dataset`, and `experiments-e1` through `experiments-e5`.

## Recovery notes

- If results fail to load, verify `public/official-results.json` is present, then rebuild.
- The checked-in `public/demo-data.json` is a 30-session real sample; rebuilds use the local `../tv4-real-bundle/` source and the checksum-verified exporter. Never substitute toy predictions.
- If a displayed value is missing, describe it as unavailable rather than estimating it.
