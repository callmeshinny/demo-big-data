// Data-driven wording for the E3/E4 takeaways: comparison words come from the JSON values.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setLanguage } from "../src/i18n.js";
import { compare, e3Hardware, e3Limitation, e3Subtitle, e3Takeaway, isSimilar, isSmallPart } from "../src/takeaways.js";

const official = JSON.parse(readFileSync(new URL("../public/official-results.json", import.meta.url), "utf8"));
const withE3 = (patch) => {
  const copy = structuredClone(official);
  copy.tables.E3 = copy.tables.E3.map((run) => ({ ...run, ...(patch[run.train_batch_size] ?? {}) }));
  return copy;
};

test("compare: higher, lower, equal, missing", () => {
  assert.equal(compare(2, 1), "higher");
  assert.equal(compare(1, 2), "lower");
  assert.equal(compare(1, 1), "equal");
  assert.equal(compare(null, 1), null);
  assert.equal(compare(1, Number.NaN), null);
});

test("E3 takeaway with the shipped data: words follow the values, numbers via format.js", () => {
  setLanguage("en");
  assert.equal(e3Takeaway(official),
    "Train batch 128 trains faster (30.6 s vs 51.7 s) and uses more GPU memory (3.9 GiB vs 2.2 GiB), with lower validation Recall@20 (0.1299 vs 0.1964).");
  setLanguage("vi");
  assert.equal(e3Takeaway(official),
    "Batch 128 huấn luyện nhanh hơn (30.6 s so với 51.7 s), dùng nhiều hơn bộ nhớ GPU (3.9 GiB so với 2.2 GiB), và Recall@20 trên validation thấp hơn (0.1299 so với 0.1964).");
  setLanguage("en");
});

test("E3 takeaway flips every word when the values flip", () => {
  setLanguage("en");
  const flipped = withE3({
    32: { train_seconds_including_sequence_io: 10, sampled_gpu_process_bytes: 4 * 1024 ** 3, "Recall@20": 0.1 },
    128: { train_seconds_including_sequence_io: 20, sampled_gpu_process_bytes: 2 * 1024 ** 3, "Recall@20": 0.2 },
  });
  const text = e3Takeaway(flipped);
  assert.match(text, /trains slower/);
  assert.match(text, /uses less GPU memory/);
  assert.match(text, /with higher validation Recall@20/);
});

test("E3 takeaway is neutral when a value is equal or missing", () => {
  setLanguage("en");
  const equal = withE3({ 32: { train_seconds_including_sequence_io: 30 }, 128: { train_seconds_including_sequence_io: 30 } });
  const missing = withE3({ 128: { sampled_gpu_status: "unavailable", sampled_gpu_process_bytes: null } });
  for (const results of [equal, missing]) {
    const text = e3Takeaway(results);
    assert.ok(!/faster|slower|\bmore\b|\bless\b|lower|higher/.test(text), text);
    assert.match(text, /^Train batch 128: training time /);
  }
  assert.match(e3Takeaway(missing), /GPU memory Not available yet/);
});

test("E3 subtitle and limitation read batch sizes and hardware from JSON", () => {
  setLanguage("en");
  assert.equal(e3Subtitle(official), "Same VM and GPU; only the GRU training batch changes (32 vs 128) · validation partition");
  assert.equal(e3Hardware(official), "one AWS VM (Ubuntu 22.04) with one Tesla T4");
  assert.ok(e3Limitation(official).startsWith("Hardware was fixed: one AWS VM (Ubuntu 22.04) with one Tesla T4. CPU, RAM"));
  setLanguage("vi");
  assert.equal(e3Hardware(official), "một VM AWS (Ubuntu 22.04) với một GPU Tesla T4");
  setLanguage("en");
  assert.equal(e3Hardware({ vm_environment: { cloud: official.vm_environment.cloud } }), "one AWS VM (Ubuntu 22.04)", "missing GPU drops that part");
  assert.equal(e3Hardware({ vm_environment: { gpu: official.vm_environment.gpu } }), "one Tesla T4", "missing VM drops that part");
  assert.equal(e3Hardware({ vm_environment: { cloud: "VM AWS", gpu: "Tesla T4" } }), "one AWS VM with one Tesla T4", "missing OS drops the brackets");
  const noHardware = { ...official, vm_environment: {} };
  assert.equal(e3Hardware(noHardware), null);
  assert.ok(e3Limitation(noHardware).startsWith("Hardware was fixed; CPU, RAM"));
});

test("10% rules: similar and small part", () => {
  assert.equal(isSimilar(100, 91), true);
  assert.equal(isSimilar(100, 90), false, "exactly 10% is not similar");
  assert.equal(isSimilar(null, 1), false);
  assert.equal(isSmallPart(9, 100), true);
  assert.equal(isSmallPart(10, 100), false);
  assert.equal(isSmallPart(1, null), false);
});

import { e4Subtitle, e4Takeaway, formatLabel } from "../src/takeaways.js";
const withE4 = (patch) => {
  const copy = structuredClone(official);
  copy.tables.E4 = copy.tables.E4.map((run) => ({ ...run, ...(patch[run.format] ?? {}) }));
  return copy;
};

test("E4 takeaway with the shipped data: similar preprocessing, 'because' clause applies", () => {
  setLanguage("en");
  assert.equal(e4Takeaway(official),
    "Parquet is smaller (24.2 MiB vs 127.8 MiB) and reads faster (0.109 s vs 0.454 s); total preprocessing time is similar (33.6 s vs 35.0 s) because reading is only a small part of it.");
  setLanguage("vi");
  assert.equal(e4Takeaway(official),
    "Parquet nhỏ hơn (24.2 MiB so với 127.8 MiB) và đọc nhanh hơn (0.109 s so với 0.454 s); tổng thời gian tiền xử lý gần như tương đương (33.6 s so với 35.0 s) vì bước đọc chỉ chiếm một phần nhỏ.");
  setLanguage("en");
  assert.equal(e4Subtitle(official), "The same 882,808 events stored as CSV and as Parquet: file size, read time, preprocessing time");
  assert.equal(formatLabel("parquet"), "Parquet");
  assert.equal(formatLabel("orc"), "ORC", "unknown formats fall back to the raw value");
});

test("E4: >= 10% preprocessing difference names the faster one; no 'because' then", () => {
  setLanguage("en");
  const text = e4Takeaway(withE4({ parquet: { preprocessing_wall_seconds_including_read: 20 } }));
  assert.match(text, /total preprocessing is faster \(20\.0 s vs 35\.0 s\)\.$/);
  assert.ok(!text.includes("because"));
  const slower = e4Takeaway(withE4({ parquet: { preprocessing_wall_seconds_including_read: 50 } }));
  assert.match(slower, /total preprocessing is slower/);
});

test("E4: 'because' only when each read is < 10% of its preprocessing time", () => {
  setLanguage("en");
  const bigRead = e4Takeaway(withE4({ csv: { read_seconds: 5 } }));
  assert.match(bigRead, /similar \(33\.6 s vs 35\.0 s\)\.$/, bigRead);
  assert.ok(!bigRead.includes("because"));
});

test("E4: equal or missing size/read values give a neutral sentence", () => {
  setLanguage("en");
  for (const results of [withE4({ parquet: { bytes: 134004153 } }), withE4({ parquet: { read_seconds: null } })]) {
    const text = e4Takeaway(results);
    assert.ok(!/smaller|larger|faster|slower|similar/.test(text), text);
    assert.match(text, /^Parquet: file size /);
  }
  const flipped = e4Takeaway(withE4({ parquet: { bytes: 300000000, read_seconds: 1 } }));
  assert.match(flipped, /Parquet is larger .* reads slower/);
});
