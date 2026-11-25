import { t } from "./i18n.js";
import { byteDisplayUnit, formatBytes, formatCount, formatMsPerSession, formatNumberOnly, formatRatio, formatSeconds, formatSecondsPerMillionEvents, formatSecondsPerMillionEventsPoint } from "./format.js";
import { modelLabel } from "./data.js";

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
  return formatNumberOnly(formatter, row?.[field]);
}

function appendUnit(label, unit) {
  return `${label} (${unit})`;
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

const E3_FIELDS = [
  ["Recall@20", "e3_recall_20_validation", formatRatio],
  ["NDCG@20", "e3_ndcg_20_validation", formatRatio],
  ["train_seconds_including_sequence_io", "e1_train_time_s", formatSeconds],
  ["process_wall_seconds", "e1_process_wall_time_s", formatSeconds],
  ["final_evaluation_seconds", "e1_final_evaluation_s", formatSeconds],
  ["eval_ms_per_session", "e1_evaluation_time_ms_session", formatMsPerSession],
  ["sampled_rss_bytes_descriptive_only", "e1_sampled_rss_descriptive", formatBytes],
  ["sampled_gpu_process_bytes", "e1_sampled_gpu_process_memory", formatBytes],
];

const E4_FIELDS = [
  ["bytes", "e4_file_size_bytes", formatBytes],
  ["read_seconds", "e4_read_time_s", formatSeconds],
  ["preprocessing_wall_seconds_including_read", "e4_preprocessing_wall_including_read_s", formatSeconds],
  ["sampled_rss_bytes_descriptive_only", "e1_sampled_rss_descriptive", formatBytes],
];

function evalPartition(run, config) {
  return config?.split_counts?.filter((item) => item.split === run?.split).at(-1)?.day_index;
}

export function buildE3E4View(results) {
  const e3 = [...(results?.tables?.E3 ?? [])].sort((a, b) => a.train_batch_size - b.train_batch_size);
  const e4 = results?.tables?.E4 ?? [];
  const firstRun = e3[0];
  const config = firstRun ? results.configs?.[firstRun.run_id] : null;
  const context = firstRun ? {
    model: firstRun.model,
    subset: firstRun.subset,
    split: firstRun.split,
    partition: evalPartition(firstRun, config),
    sessions: firstRun.n_sessions,
    evalBatchSize: config?.actual?.eval_batch_size,
    changeOnly: config?.planned?.resource_config?.change_only,
  } : null;
  const protocol = results?.dictionary?.inference_protocol?.split(";")[0];
  const e3ByteUnits = Object.fromEntries(["sampled_rss_bytes_descriptive_only", "sampled_gpu_process_bytes"].map((field) => [
    field, byteDisplayUnit(e3.map((run) => run[field])),
  ]));
  const e4ByteUnits = Object.fromEntries(["bytes", "sampled_rss_bytes_descriptive_only"].map((field) => [
    field, byteDisplayUnit(e4.map((run) => run[field])),
  ]));
  return {
    e3: {
      models: e3.map((run) => ({
        runId: run.run_id,
        batchSize: run.train_batch_size,
        cells: E3_FIELDS.map(([field, label, formatter]) => {
          const unit = e3ByteUnits[field];
          return {
          field,
          label: `${t(label)}${unit ? ` (${unit})` : ""}`,
          ...(field === "sampled_gpu_process_bytes" && run.sampled_gpu_status === "unavailable"
            ? { text: t("not_measured"), raw: String(run[field]) }
            : formatNumberOnly(formatter, run[field], unit)),
          };
        }),
      })),
      rows: E3_FIELDS.map(([field, label]) => ({
        field,
        label: `${t(label)}${e3ByteUnits[field] ? ` (${e3ByteUnits[field]})` : ""}`,
      })),
      context,
      note: t("e3_eval_note", protocol ?? t("MISSING")),
      accuracyNote: results?.dictionary?.E3_accuracy,
    },
    e4: {
      formats: e4.map((run) => ({
        label: run.format,
        runId: run.run_id,
        cells: E4_FIELDS.map(([field, label, formatter]) => ({
          field,
          label: `${t(label)}${e4ByteUnits[field] ? ` (${e4ByteUnits[field]})` : ""}`,
          ...formatNumberOnly(formatter, run[field], e4ByteUnits[field]),
        })),
      })),
      rows: E4_FIELDS.map(([field, label]) => ({
        field,
        label: `${t(label)}${e4ByteUnits[field] ? ` (${e4ByteUnits[field]})` : ""}`,
      })),
      preprocessingNote: results?.dictionary?.E4_preprocessing_wall,
      excluded: Object.entries(results?.excluded ?? {}),
    },
  };
}

export function formatE3Context(context) {
  if (!context) return t("MISSING");
  const number = (value) => value == null ? t("MISSING") : formatCount(value).text;
  const changedField = context.changeOnly === "train_batch_size" ? t("experiment_train_batch").toLocaleLowerCase() : t("MISSING");
  return t("e3_context", modelLabel(context.model), number(context.subset), context.split, number(context.partition), number(context.sessions), number(context.evalBatchSize), changedField);
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
