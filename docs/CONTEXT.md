# TV4 demo context

Snapshot 21/11/2026, team commit `43841c9`. The team repo `tlmthuy/Big-Data` owns the artifacts and contract.

- The course requires an English report, slides and talk, with 15 minutes for the presentation and 5 for Q&A. Cover the dataset and 5Vs, subset selection and diversity, problem and method, deployment, experiment design and results. Source `docs/course_requirements.txt`.
- TV1 selected the cuDF weekly cleanup set for official experiments. The DuckDB profiles, workflows and per-day splits are reference data. Sampling retains whole sessions by seeded SHA-256 in nested subsets over the first week of October 2019 UTC. Source `data/manifests/session_sampling_manifest.json`.
- The merged contract is at `5f839a7`. TV2 splits sessions within day partitions, trains on day t and validates on the next day. Final test uses the last partition and the checkpoint from earlier partitions. Each session gets one Top-20 evaluated against its last item. Recall@20 records a hit. NDCG@20 discounts lower ranks. Both aggregate over sessions. Source `docs/modeling/model_protocol.md`.
- Prediction rows carry original IDs for recommendations and encoded IDs for history and target. Use the run catalog and recorded SHA-256 to decode the latter. TV2 exports ranked IDs only. Delivered model runs are toy or smoke.

## Demo decisions

The static demo defaults to English and offers Vietnamese. Show preliminary timings with a label in Dataset only. Describe day splits in text. Keep the Score column. Keep raw-month missing counts and omit the weekly missing rows. The TV3 VM block stays pending.

## Still pending

| Owner | Delivery |
| --- | --- |
| TV1 | Product metadata CSV with brand, category code and price. Per-day cuDF split counts are optional. |
| TV2 | Real predictions with matching catalog, and the official E1–E5 package with TV3. |

## History

- The 20/11 snapshot tracked contract approval and initial toy exports. The contract has since merged, and toy runs still support the UI.
- Earlier work used the DuckDB workflow as reference. TV1 selected the cuDF weekly artifacts for official runs.
- The first demo snapshots tracked the planned export dates, smoke runs, and VM handoff. Official measurements and run-linked environment remain dependent on the team package.
