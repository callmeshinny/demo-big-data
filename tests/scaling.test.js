import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setLanguage } from "../src/i18n.js";
import { buildScalingView, chartCoordinates } from "../src/scaling.js";

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
