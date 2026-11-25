import { setLanguage, t } from "../src/i18n.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { histogramBuckets, normalizeDataset } from "../src/dataset.js";
import overview from "../public/dataset-overview.json" with { type: "json" };

setLanguage(process.env.TV4_TEST_LANGUAGE);

test("keeps missing buckets distinct from observed zero and sums longer buckets", () => {
  const buckets = histogramBuckets({ 1: 10, 2: 0, 21: 4, 25: 3 });
  assert.deepEqual(buckets.slice(0, 3).map((bucket) => bucket.count), [10, 0, null]);
  assert.deepEqual(buckets.at(-1), { label: "21+", count: 7 });
});

test("rejects a malformed dataset overview", () => {
  assert.ok(normalizeDataset({ subsets: [] }).fatal);
});

test("official supplementary tables are shipped with source columns and confirmation", () => {
  assert.equal(overview.data_kind, "real");
  assert.equal(overview.source_confirmed_by, "TV2 package tv2-20261124 supplementary tables");
  assert.equal(overview.source_package, "tv2-20261124");
  assert.equal(overview.subsets.length, 4);
  assert.deepEqual([overview.subsets[0].length_TV_vs_100, overview.subsets.at(-1).length_TV_vs_100], [0.0018243727980889587, 0]);
  assert.ok(overview.subsets.every((row) => row.last_partition_D === 7));
  assert.equal(overview.subsets[0].event_TV_vs_100, 0.000025267934947149364);
  assert.deepEqual(
    [overview.subsets[0].model_sequences, overview.subsets[0].cleaned_categories, overview.subsets[0].actual_raw_event_pct],
    [96433, 557, 9.998602382925785],
  );
  assert.ok(overview.subsets.every((row) => row.final_test_D != null && row.train_used_1_to_Dminus1 != null && row.validation_used_2_to_D != null));
  assert.equal(overview.event_mix_before_after.length, 3);
});
