# TV4 demo work handoff

Snapshot: 25 November 2026  
Repository: `tv4-demo-web`  
Official source package: `tv2-20261124` from the adjacent read-only `../Big-Data` repository.

## Overall result

The demo uses the official TV2 package for E1–E5 experiment results, dataset overview, figures, and bilingual demo materials. The Recommendation view now replays a fixed, checksum-verified sample of real E1 predictions. TV1 product metadata remains pending, so recommendation cards show original product IDs only.

No team-repository files were changed and nothing was pushed.

## Completed steps and commits

| Step | Work | Commit |
|---|---|---|
| 0 | Added team progress context; established baseline | `0e8c5b6 docs: add team progress context 25/11` |
| 1 | Added number formatting helpers and tests | `0397bab feat: display formatting helpers with tests` |
| 2 | Added checksum-aware official results adapter and JSON | `413c9c0 feat: adapter for official TV2 package tv2-20261124` |
| 3 | Improved readability, compacted header and removed repeated intros | `0f52d28 style: larger readable text, compact header, remove duplicate intros` |
| 4 | Added official E1 comparison panel | `c586b38 feat: E1 panel with official package values` |
| 5 | Added E2 table and E5 scaling charts | `c90b0e5 feat: E2 table and E5 scaling charts from official package` |
| 6 | Added E3 batch and E4 format comparisons | `938b204 feat: E3 batch comparison and E4 format comparison` |
| 7 | Added planned/actual configuration, runtime and hidden toy details | `cea6d67 feat: configuration and environment details for experiments` |
| 8 | Replaced dataset overview with official supplementary tables | `e7badce feat: dataset tab from TV2 supplementary tables, remove preliminary section` |
| 9 | Updated recommendation wording/layout and checked for real bundle | `2c65031 feat: recommendation layout, interaction wording, real-bundle check` |
| 10 | Generated official figures and captions from package JSON | `e945059 feat: official figures and captions from tv2-20261124` |
| 11 | Updated context, bilingual talk track, demo runbook and README; captured EN/VI screenshots | `11e75d2 docs: demo script with official results, context and fallback` |
| 12 | Final audit; localized E5 axis labels and tested them | `aaa0825 fix: final audit corrections` |
| 13 | Added verified real E1 predictions as a fixed 30-session sample; product metadata remains pending | See current Step 13 commit below |

## Key data and interpretation decisions

- Official metrics are copied from the package into `public/official-results.json`; values are not recomputed.
- Checksums normalize CRLF to LF. Package, analysis and evidence mismatches fail; the documented `environment/README.md` post-package documentation edit is the allowed warning exception and is not used as a numeric source.
- E3 has no throughput row because the package contains no throughput field. Its table uses the delivered validation and process-wall fields.
- E3 validation results are not directly comparable with E1/E2 test results.
- E4 preprocessing wall time includes reading; it is not added to standalone read time. The package records warm-cache conditions.
- E5 composed time excludes shared first-seen and is not observed end-to-end wall time.
- E1 results represent a single run and seed.
- Missing values stay unavailable; no scores are inferred from ranks.
- The local `../tv4-real-bundle/` is an export input only and must never be committed. The public app stores only sampled IDs and the catalog subset; full-catalog SHA and size are retained.
- TV1 product lookup remains pending; product cards show original IDs only.

## Final audit evidence

- JavaScript tests: 32 passed.
- Python tests: 9 passed with `PYTHONPATH=../Big-Data:scripts`.
- Production build: passed.
- Official results and dataset adapters regenerated outputs equivalent to committed JSON (excluding the official export timestamp).
- Figure generator rebuilt the six expected SVGs: E1 ranking, E1 training, E2 training, E3 tradeoff, E4 format, E5 scaling.
- Browser audit covered E1–E5 at 1280 px and 375 px in English and Vietnamese, toggled configuration details, and found no horizontal overflow or untranslated keys after fixing the E5 event-axis labels.
- Recommendation screenshots were captured in English and Vietnamese at both widths, along with dataset and experiment screenshots.
- High-precision numeric literals are absent from `src/`.
- `git diff --check` passed and the working tree was clean after the final commit.

Ten screen-to-package spot checks are documented in the Step 12 report from the previous conversation. The team package remains the source of truth for every reported value.

## Current stopping point

Step 13 adds the checksum-verified real E1 sample and Recommendation UI; TV1 product metadata remains pending. No team-repository files were changed and nothing was pushed.
