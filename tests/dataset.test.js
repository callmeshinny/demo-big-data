import { test } from "node:test";
import assert from "node:assert/strict";
import { histogramBuckets, normalizeDataset } from "../src/dataset.js";

test("keeps missing buckets distinct from observed zero and sums longer buckets", () => {
  const buckets = histogramBuckets({ 1: 10, 2: 0, 21: 4, 25: 3 });
  assert.deepEqual(buckets.slice(0, 3).map((bucket) => bucket.count), [10, 0, null]);
  assert.deepEqual(buckets.at(-1), { label: "21+", count: 7 });
});

test("rejects a malformed dataset overview", () => {
  assert.ok(normalizeDataset({ subsets: [] }).fatal);
});
