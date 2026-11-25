import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setLanguage } from "../src/i18n.js";
import { buildE3E4View, buildScalingView, chartCoordinates, formatE3Context } from "../src/scaling.js";

const official = JSON.parse(readFileSync(new URL("../public/official-results.json", import.meta.url), "utf8"));

test("E5 charts use all E2 event counts and exclude shared first-seen", () => {
  setLanguage("en");
  const view = buildScalingView(official);
  const e2Events = official.tables.E2.map((row) => row.n_events);
  assert.equal(view.charts.length, 2);
  for (const chart of view.charts) {
    assert.equal(chart.series.length, 4);
    assert.deepEqual(chart.series.map((point) => point.x), e2Events);
    assert.equal(chartCoordinates(chart.series).length, 4);
  }
  const composed = view.charts.find((chart) => chart.id === "composed");
  assert.deepEqual(composed.series.map((point) => point.y), official.tables.E5.map((row) => row.composed_seconds_excluding_first_seen));
  assert.ok(composed.series.every((point, index) => point.y !== official.tables.E5[index].composed_seconds_with_first_seen));
  assert.equal(view.e2Table.firstSeen, official.tables.E2[0].first_seen_shared_seconds);
});

test("E3 and E4 panels preserve official configs, measurements, notes, and exclusions", () => {
  setLanguage("en");
  const { e3, e4 } = buildE3E4View(official);
  assert.deepEqual(e3.models.map((run) => run.batchSize), [32, 128]);
  assert.equal(formatE3Context(e3.context), "GRU · 10% subset · validation partition 7 · 1,324 sessions · eval batch 32 · only train batch changes");
  assert.ok(e3.note.includes(official.dictionary.inference_protocol.split(";")[0]));
  assert.equal(e3.rows.length, 8);
  assert.deepEqual(e4.formats.map((format) => format.label), ["csv", "parquet"]);
  assert.equal(e4.formats[0].cells[0].text, "127.8 MiB");
  assert.equal(e4.formats[0].cells[2].raw, String(official.tables.E4[0].preprocessing_wall_seconds_including_read));
  assert.equal(e4.excluded.length, 2);
});
