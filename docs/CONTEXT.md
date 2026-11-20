# Project context for agents

Snapshot as of 20/11/2026. Team repo: `https://github.com/tlmthuy/Big-Data`.

## 1. The project

The task is session-based next-item recommendation on the Kaggle "eCommerce behavior data from multi-category store" dataset (2019-Oct).

- **Input:** a session's history (prefix), for example A → B → C.
- **Output:** the Top-20 products most likely to come next.
- **Ground truth:** the session's real last item (the target).
- **Metrics:** Recall@20 and NDCG@20.
- **Models:** a Popularity baseline, plus GRU and XLNet from NVIDIA Transformers4Rec (tutorial notebook 03, pinned upstream `f0ca2b5`).

Big Data experiments:

| ID | Question | Varied | Required results |
| --- | --- | --- | --- |
| E1 | Which model is better? | Popularity / GRU / XLNet on 10% subset | Recall@20, NDCG@20, train and inference time |
| E2 | Effect of data size | GRU on 10 / 25 / 50 / 100% sessions | runtime, memory, bytes, event/user counts |
| E3 | Effect of resources | GRU 10%, train batch 32 vs 128, eval batch 32 | runtime, throughput, memory, cost if any |
| E4 | CSV vs Parquet | same content, 10% raw subset | size, read time, preprocessing time, memory |
| E5 | Scalability | derived from E2 logs, no new training | runtime per 1M events, bottleneck, limitations |

"100%" means the first week of October, not the whole month.

## 2. Team

| Member | Owns | Hands over to TV4 |
| --- | --- | --- |
| TV1 (Châu) | Data: audit, sampling, cleaning, first-seen, workflow/mapping/catalog, sequences, splits | Catalog, ID mapping, session key encoding, pipeline metrics per subset |
| TV2 (Thùy) | Models, protocol, metrics, experiment matrix, official metrics package | Predictions + scores, run-level E1–E5 package, config confirmations |
| TV3 (Đăng) | Cloud GPU VM, runtime, running E1–E5, resource logs | CPU/RAM/OS per run, resource logs |
| **TV4 (Ngọc — demo)** | **Web demo, figures support** | — |
| TV5 | Report, slides, tables | Uses the same TV2 package |

## 3. TV4 schedule

| Date | Task | State |
| --- | --- | --- |
| 19/11 | Demo skeleton, README, figures folder | Done (team repo) |
| 20/11 | Output contract: input, prediction, score, rank, target | Done. Proposal at commit `5b2df90`, **awaiting TV2 approval** |
| 21/11 | Sample prediction JSON/CSV, format confirmed by TV2 | Next |
| 22/11 | Figure script skeleton from metrics package | — |
| 25–26/11 | Figure templates/captions, run_id checks | — |
| 27/11 | Integrate inference output into the demo, build UI, test | — |
| 28/11 | Official figures, demo fallback (screenshots / static JSON), live demo practice | — |

## 4. The data contract (summary)

Full text: `docs/data_contract.md`. It is a pinned copy of `app/output_contract.md` at team commit `5b2df90`.

### Part A — Session prediction (`public/demo-data.json`)

TV2's evaluators write `predictions.jsonl` with exactly five keys per session: `user_session`, `prefix`, `target`, `top20`, `product_ids`. **No score yet.**

The current demo file shape (toy, produced by `scripts/export_demo_data.py`):

```json
{"model": "Popularity", "subset": "toy", "split": "validation",
 "catalog": ["p3", "...", "p25"],
 "sessions": [{"user_session": "rank1", "prefix": ["p4"], "target": "p3", "top20": ["p3", "p4", "..."]}]}
```

Proposed additions (not yet approved):
- `run_id`;
- `data_kind`;
- `catalog_sha256`;
- `target_rank` (`null` when the target is outside Top-20);
- `recommendations: [{rank, product_id, score: null}]`.

The toy sessions are `rank1` (target ranked 1), `rank20` (target ranked 20) and `miss` (target outside Top-20). The catalog has 23 items.

### Part B — Run results E1–E5 (`public/run-results.json`, planned)

One record per run, with these blocks:
- identity: `experiment`, `run_id`, `model`, `status`, `data_kind`, `exclusion_note`;
- `planned` config, copied from `configs/experiments.json`;
- `actual` config, from the run's `metrics.json`;
- `environment`: GPU, CUDA, driver, Python, torch, CPU, cores, RAM, OS;
- `metrics`: `{name: {value, unit, scope}}`;
- `sources`.

Key metric fields:
- `Recall@20`, `NDCG@20`;
- `train_with_input_scan_seconds`;
- `inference_seconds` (protocol `full_evaluation_wall_v1`, includes I/O, not pure latency);
- `inference_ms_per_session`, `inference_sessions_per_second`;
- `peak_process_tree_rss_bytes`, `peak_cuda_reserved_bytes`;
- E4: `bytes`, `read_seconds`;
- E5: `seconds_per_million_events`, `bottleneck`.

Do not use `prediction_compute_seconds` for comparison; it is diagnostic only.

### UI plan

- **Recommendation tab:**
  - session picker and model selector;
  - history and actual next item;
  - Top-20 with rank and score ("Chưa có" until score is delivered);
  - run ID and toy badge.
- **Experiments tab:** one panel each for E1–E5. Each panel has a Dự kiến / Thực tế config block, environment, metrics with units, and source run IDs. E3 shows `e3-gru-010-b32` and `e3-gru-010-b128` side by side.

## 5. Known UI issues (from team review, `docs/upstream_TODO.md`)

- [x] Original product IDs and the full 23-item catalog.
- [x] Selecting GRU/XLNet hides history and target. It should only replace the recommendation area with "Chưa có".
- [x] Validate the data shape before rendering (empty `sessions`, unknown session, missing `prefix`/`target`/`top20`).
- [x] Browser checks: `rank1`, `rank20`, `miss`, model switching, broken data, narrow screen.

## 6. What is still missing (open dependencies)

| Owner | Needed | Status |
| --- | --- | --- |
| TV2 | Approve the contract (format, field names, `run-results.json`) | Waiting |
| TV2 | Per-item score and its meaning | Scripts done, no score exported |
| TV2 | Real predictions for 3 models on the same subset/split | Waits on TV1 tasks 10–13 |
| TV2 | Official E1–E5 package, with excluded runs | Due 24/11 |
| TV2 | Confirm actual eval batch, sequence length, E3 throughput/cost, E5 inference scope and uncertainty | Planned values only |
| TV1 | Fitted workflow, real catalog/mapping, session key encoding | Tasks 10–11 not done |
| TV1 | Preprocessing time and bytes per subset in `pipeline_metrics` format | Task 13 not done. Raw counts per subset and first-seen cost already exist. |
| TV3 | CPU, cores, RAM, OS per run; real resource logs | VM / runs not done |

Until these arrive, build everything against toy data and the missing-data states.

## 7. Useful facts

- Toy Popularity run: `metrics/tv2-toy-day1` in the team repo (3 sessions, Recall@20 = 0.667).
- Toy collector runs for E1 and E3 (format reference only): `metrics/tv2-config-collector-smoke/` in the team repo.
- Raw subset counts (10 / 25 / 50 / 100%), from `data/manifests/raw_subset_counts.csv`:

  | Subset | Events | Sessions | Users | Items |
  | --- | --- | --- | --- | --- |
  | 10% | 882,808 | 187,563 | 163,847 | 63,398 |
  | 25% | 2,213,138 | 469,728 | 356,271 | 87,247 |
  | 50% | 4,421,037 | 938,071 | 601,608 | 103,940 |
  | 100% | 8,829,314 | 1,877,365 | 957,543 | 118,333 |

  These are **before** cleaning and sequencing. Do not show them as E2 results unless TV2 confirms.
