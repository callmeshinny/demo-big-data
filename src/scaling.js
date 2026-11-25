import { t } from "./i18n.js";
import { formatCount, formatRatio, formatSeconds, formatSecondsPerMillionEvents, formatSecondsPerMillionEventsPoint } from "./format.js";

const E2_FIELDS = [
  ["Recall@20", "e1_recall_20", formatRatio],
  ["NDCG@20", "e1_ndcg_20", formatRatio],
  ["n_sessions", "e2_test_sessions", formatCount],
  ["train_seconds_including_sequence_io", "e1_train_time_s", formatSeconds],
  ["final_evaluation_seconds", "e1_final_evaluation_s", formatSeconds],
  ["process_wall_seconds", "e1_process_wall_time_s", formatSeconds],
  ["raw_read_seconds", "e2_raw_read_s", formatSeconds],
  ["preprocessing_seconds", "e2_preprocessing_s", formatSeconds],
];

const E5_FIELDS = [
  ["raw_read", "e2_raw_read_s", formatSeconds],
  ["preprocessing_excluding_raw_read_and_first_seen", "e2_preprocessing_s", formatSeconds],
  ["train_including_sequence_io", "e1_train_time_s", formatSeconds],
  ["final_evaluation_including_io", "e1_final_evaluation_s", formatSeconds],
  ["composed_seconds_excluding_first_seen", "e5_composed_time_s", formatSeconds],
  ["seconds_per_million_events", "e5_seconds_per_million_events", formatSeconds],
  ["bottleneck", "e5_bottleneck", (value) => ({ text: value == null ? t("MISSING") : value.replaceAll("_", " "), raw: value == null ? String(value) : String(value) })],
];

function rowCell(row, field, formatter) {
  return formatter(row?.[field]);
}

export function buildScalingView(results) {
  const e2 = [...(results?.tables?.E2 ?? [])].sort((a, b) => a.subset - b.subset);
  const e5 = [...(results?.tables?.E5 ?? [])].sort((a, b) => a.subset - b.subset);
  const e2BySubset = new Map(e2.map((row) => [row.subset, row]));
  const e5BySubset = new Map(e5.map((row) => [row.subset, row]));
  const e2Table = {
    columns: e2.map((run) => ({
      subset: run.subset,
      events: formatCount(run.n_events),
      runId: run.run_id,
      cells: E2_FIELDS.map(([field, , formatter]) => rowCell(run, field, formatter)),
    })),
    rows: E2_FIELDS.map(([field, label]) => ({ field, label: t(label) })),
    firstSeen: e2[0]?.first_seen_shared_seconds,
    firstSeenNote: results?.dictionary?.first_seen_shared,
    accuracyNote: results?.dictionary?.E2_accuracy,
  };
  const e5Table = {
    columns: e5.map((run) => ({ subset: run.subset, runId: run.run_id })),
    rows: E5_FIELDS.map(([field, label, formatter]) => ({
      field,
      label: t(label),
      cells: e5.map((run) => rowCell(run, field, formatter)),
    })),
    composedNote: results?.dictionary?.E5_composed,
  };
  const charts = [
    {
      id: "composed",
      title: t("e5_composed_seconds_chart"),
      yLabel: t("e5_composed_seconds_axis"),
      series: e5.map((row) => ({
        subset: row.subset,
        x: e2BySubset.get(row.subset)?.n_events ?? null,
        y: row.composed_seconds_excluding_first_seen,
        runId: row.run_id,
      })),
      formatY: formatSeconds,
      formatPoint: formatSeconds,
    },
    {
      id: "normalized",
      title: t("e5_normalized_seconds_chart"),
      yLabel: t("e5_normalized_seconds_axis"),
      series: e5.map((row) => ({
        subset: row.subset,
        x: e2BySubset.get(row.subset)?.n_events ?? null,
        y: row.seconds_per_million_events,
        runId: row.run_id,
      })),
      formatY: formatSecondsPerMillionEvents,
      formatPoint: formatSecondsPerMillionEventsPoint,
    },
  ];
  return { e2Table, e5Table, charts };
}

export function chartCoordinates(series, width = 600, height = 300) {
  const points = series.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!points.length) return [];
  const left = 66, right = width - 24, top = 24, bottom = height - 54;
  const xs = points.map((point) => point.x), ys = points.map((point) => point.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  return points.map((point) => ({
    ...point,
    cx: left + (maxX === minX ? 0.5 : (point.x - minX) / (maxX - minX)) * (right - left),
    cy: bottom - (maxY === minY ? 0.5 : (point.y - minY) / (maxY - minY)) * (bottom - top),
  }));
}
