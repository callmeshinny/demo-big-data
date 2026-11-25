import { t } from "./i18n.js";
import { formatBytes, formatCount, formatMsPerSession, formatRatio, formatSeconds } from "./format.js";
import { modelLabel } from "./data.js";

const FIELDS = [
  ["Recall@20", "e1_recall_20", formatRatio],
  ["NDCG@20", "e1_ndcg_20", formatRatio],
  ["train_seconds_including_sequence_io", "e1_train_time_s", formatSeconds],
  ["final_evaluation_seconds", "e1_final_evaluation_s", formatSeconds],
  ["eval_ms_per_session", "e1_evaluation_time_ms_session", formatMsPerSession],
  ["process_wall_seconds", "e1_process_wall_time_s", formatSeconds],
  ["sampled_rss_bytes_descriptive_only", "e1_sampled_rss_descriptive", formatBytes],
  ["sampled_gpu_process_bytes", "e1_sampled_gpu_process_memory", formatBytes],
];

export function buildE1View(results) {
  const runs = results?.tables?.E1 ?? [];
  const models = ["Popularity", "GRU", "XLNet"].map((label) => ({
    label,
    run: runs.find((run) => modelLabel(run.model) === label) ?? null,
  }));
  const firstRun = models.find(({ run }) => run)?.run;
  const config = firstRun ? results.configs?.[firstRun.run_id] : null;
  const partition = config?.split_counts?.filter((item) => item.split === firstRun?.split).at(-1)?.day_index;
  return {
    models,
    context: firstRun ? {
      subset: firstRun.subset,
      split: firstRun.split,
      partition,
      sessions: firstRun.n_sessions,
    } : null,
    rows: FIELDS.map(([field, labelKey, formatter]) => ({
      field,
      label: t(labelKey),
      cells: models.map(({ run }) => {
        const raw = run?.[field];
        if (field === "sampled_gpu_process_bytes" && run?.sampled_gpu_status === "unavailable") {
          return { text: t("not_measured"), raw: raw === null || raw === undefined ? "null" : String(raw) };
        }
        return formatter(raw);
      }),
    })),
    notes: [
      [t("e1_inference_protocol"), results?.dictionary?.inference_protocol],
      [t("e1_training_time_scope"), results?.dictionary?.train_seconds_including_sequence_io],
      [t("e1_sampled_rss_scope"), results?.dictionary?.sampled_rss_bytes_descriptive_only],
      [t("e1_sampled_gpu_scope"), results?.dictionary?.sampled_gpu_process_bytes],
    ],
  };
}

export function formatE1Context(context) {
  if (!context) return t("MISSING");
  const partition = context.partition == null ? t("MISSING") : formatCount(context.partition).text;
  return t("e1_context", context.subset, context.split, partition, formatCount(context.sessions).text);
}
