// Key finding guards: a headline or added clause appears only when the JSON values agree with it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setLanguage } from "../src/i18n.js";
import { datasetFindings, e1Best, e1Cheapest, e1Finding, e2Finding, e3Finding, e4Finding, e5Finding, stageShort, strictlyIncreasing } from "../src/findings.js";
import { formatPercentShare } from "../src/format.js";

const official = JSON.parse(readFileSync(new URL("../public/official-results.json", import.meta.url), "utf8"));
const overview = JSON.parse(readFileSync(new URL("../public/dataset-overview.json", import.meta.url), "utf8"));
const patchTable = (table, key, patch) => {
  const copy = structuredClone(official);
  copy.tables[table] = copy.tables[table].map((row) => ({ ...row, ...(patch[row[key]] ?? {}) }));
  return copy;
};
setLanguage("en");

test("E1: best needs Recall@20 and NDCG@20 to agree; cheapest needs train and eval time to agree", () => {
  const runs = official.tables.E1;
  assert.equal(e1Best(runs).model, "xlnet");
  assert.equal(e1Cheapest(runs).model, "Popularity");
  assert.equal(e1Finding(official).headline, "XLNet is the most accurate; Popularity is the cheapest");
  const split = patchTable("E1", "model", { gru: { "NDCG@20": 1 } });
  assert.equal(e1Best(split.tables.E1), null);
  assert.equal(e1Finding(split).headline, "Popularity is the cheapest", "accuracy half omitted");
  const costly = patchTable("E1", "model", { Popularity: { final_evaluation_seconds: 99 } });
  assert.equal(e1Finding(costly).headline, "XLNet is the most accurate", "cost half omitted");
  const neither = patchTable("E1", "model", { gru: { "NDCG@20": 1 }, Popularity: { final_evaluation_seconds: 99 } });
  assert.equal(e1Finding(neither).headline, null, "no headline when both halves are omitted");
  const missing = patchTable("E1", "model", { xlnet: { "Recall@20": null } });
  assert.equal(e1Best(missing.tables.E1), null);
});

test("E1: GRU-vs-Popularity clause only when Popularity < GRU < best", () => {
  assert.match(e1Finding(official).body, /GRU is only slightly above Popularity on this test \(0\.0883 vs 0\.0868\)\./);
  const gruLower = patchTable("E1", "model", { gru: { "Recall@20": 0.05 } });
  assert.ok(!e1Finding(gruLower).body.includes("only slightly above"));
});

test("E2: headline only when Recall@20 rises strictly with subset size", () => {
  assert.equal(strictlyIncreasing([1, 2, 3]), true);
  assert.equal(strictlyIncreasing([1, 3, 2]), false);
  assert.equal(strictlyIncreasing([1, null]), false);
  assert.equal(e2Finding(official).headline, "More data, higher accuracy — but not from training data alone");
  assert.match(e2Finding(official).body, /^Recall@20 goes from 0\.0883 at 10% to 0\.3899 at 100%\./);
  const dip = patchTable("E2", "subset", { 50: { "Recall@20": 0.01 } });
  assert.equal(e2Finding(dip).headline, null);
});

test("E3: trade-off headline needs a lower process time AND lower Recall@20 for the larger batch", () => {
  assert.equal(e3Finding(official).headline, "A larger batch is a trade-off, not a free improvement");
  const noTradeOff = patchTable("E3", "train_batch_size", { 128: { "Recall@20": 0.5 } });
  assert.equal(e3Finding(noTradeOff).headline, null);
  const slower = patchTable("E3", "train_batch_size", { 128: { process_wall_seconds: 999 } });
  assert.equal(e3Finding(slower).headline, null);
});

test("E3: updates clause needs equal epochs; evaluation clause needs equal eval batch and < 10% difference", () => {
  const body = e3Finding(official).body;
  assert.match(body, /With the same number of epochs, the larger batch makes fewer optimizer updates\./);
  assert.match(body, /Evaluation time stays close \(0\.716 s vs 0\.708 s\) because the eval batch is fixed at 32\./);
  const farEval = patchTable("E3", "train_batch_size", { 128: { final_evaluation_seconds: 5 } });
  assert.ok(!e3Finding(farEval).body.includes("Evaluation time stays close"));
  const epochs = structuredClone(official);
  const id = epochs.tables.E3.find((run) => run.train_batch_size === 128).run_id;
  epochs.configs[id].actual.epochs = 9;
  assert.ok(!e3Finding(epochs).body.includes("optimizer updates"));
});

test("E4: headline needs smaller AND faster read AND each read < 10% of its preprocessing", () => {
  assert.equal(e4Finding(official).headline, "Parquet saves storage and read time; the full pipeline gains much less");
  assert.match(e4Finding(official).body, /Cleanup, fitting, grouping and splitting still run for both formats\.$/);
  assert.equal(e4Finding(patchTable("E4", "format", { parquet: { bytes: 999999999 } })).headline, null);
  assert.equal(e4Finding(patchTable("E4", "format", { parquet: { read_seconds: 9 } })).headline, null);
  assert.equal(e4Finding(patchTable("E4", "format", { csv: { read_seconds: 30 } })).headline, null, "read is not a small part");
});

test("E5: bottleneck headline from the first and last subset; shares from stage_shares (1 decimal)", () => {
  const finding = e5Finding(official);
  assert.equal(finding.headline, "The bottleneck moves from preprocessing to training as data grows");
  const shares = Object.fromEntries(official.stage_shares.rows.map((row) => [row.subset, row]));
  assert.ok(finding.body.startsWith(`Preprocessing is ${formatPercentShare(shares[10].preprocessing).text} of the composed time at 10%; training is ${formatPercentShare(shares[100].train).text} at 100%.`));
  assert.match(finding.body, /Time per million events goes from 66\.7 s to 55\.6 s/);
  const same = patchTable("E5", "subset", { 10: { bottleneck: "train_including_sequence_io" } });
  assert.equal(e5Finding(same).headline, "The main cost stays in training");
  const rising = patchTable("E5", "subset", { 100: { seconds_per_million_events: 999 } });
  assert.ok(!e5Finding(rising).body.includes("Time per million events"));
  const preEnd = patchTable("E5", "subset", { 100: { bottleneck: "preprocessing_excluding_raw_read_and_first_seen" } });
  assert.ok(!e5Finding(preEnd).body.includes("Faster file reading"));
  assert.equal(stageShort("some_new_stage"), "some new stage");
  const noShares = { ...official, stage_shares: undefined };
  assert.ok(!e5Finding(noShares).body.includes("Preprocessing is"));
});

test("Dataset findings: values from dataset-overview.json; guards follow the data", () => {
  const [d1, d2, d3] = datasetFindings(overview);
  assert.equal(d1.headline, "Cleanup turns the task into next-product browsing");
  assert.match(d1.body, /^Views are 96\.21% of raw weekly events and 99\.98% of cleaned events at 100%/);
  assert.match(d2.body, /^48\.58% of sessions have only one interaction/);
  assert.equal(d3.headline, "A 10% subset still shares many products with the full week");
  assert.match(d3.body, /has 63,398 of 118,333 products \(53\.58%\)/);
  const flat = structuredClone(overview);
  flat.event_mix_before_after.find((row) => row.event_type === "view").clean_100_pct = 1;
  assert.equal(datasetFindings(flat)[0].headline, null);
  const noCoverage = structuredClone(overview);
  for (const row of noCoverage.subsets) delete row.catalog_coverage_of_100_pct;
  assert.ok(!datasetFindings(noCoverage)[2].body.includes("("), "no brackets without a coverage field");
  const fewProducts = structuredClone(overview);
  fewProducts.subsets.find((row) => row.subset === 10).catalog_coverage_of_100_pct = 5;
  assert.equal(datasetFindings(fewProducts)[2].headline, null);
});
