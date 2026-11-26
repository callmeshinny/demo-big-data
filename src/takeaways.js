// Takeaway sentences for E3 and E4. Every comparison word is chosen here by comparing the delivered
// JSON values; equal or missing values give a neutral sentence that only lists the values.
// All numbers are formatted by src/format.js; templates live in src/i18n.js (no numeric literals there).
import { messages, t } from "./i18n.js";
import { byteDisplayUnit, formatBytes, formatCount, formatRatio, formatSeconds, isMissing } from "./format.js";
import { modelLabel } from "./data.js";

/** "higher" | "lower" | "equal" | null (missing) for a compared with b. */
export function compare(a, b) {
  if (isMissing(a) || isMissing(b)) return null;
  if (a === b) return "equal";
  return a > b ? "higher" : "lower";
}

/** Two values are "similar" when they differ by less than this share of the larger one. */
export const SIMILAR_SHARE = 0.1;
/** Reading counts as "a small part" of preprocessing when it is below this share of it. */
export const SMALL_PART_SHARE = 0.1;

export function isSimilar(a, b, share = SIMILAR_SHARE) {
  if (isMissing(a) || isMissing(b)) return false;
  const larger = Math.max(Math.abs(a), Math.abs(b));
  return larger === 0 ? true : Math.abs(a - b) / larger < share;
}

export function isSmallPart(part, whole, share = SMALL_PART_SHARE) {
  if (isMissing(part) || isMissing(whole) || whole <= 0) return false;
  return part / whole < share;
}

const word = { lowerTime: "cmp_faster", higherTime: "cmp_slower", higherAmount: "cmp_more", lowerAmount: "cmp_less",
  lowerScore: "cmp_lower", higherScore: "cmp_higher", lowerSize: "cmp_smaller", higherSize: "cmp_larger" };
const timeWord = (direction) => t(direction === "lower" ? word.lowerTime : word.higherTime);
const amountWord = (direction) => t(direction === "higher" ? word.higherAmount : word.lowerAmount);
const scoreWord = (direction) => t(direction === "lower" ? word.lowerScore : word.higherScore);
const sizeWord = (direction) => t(direction === "lower" ? word.lowerSize : word.higherSize);
const decided = (...directions) => directions.every((direction) => direction === "higher" || direction === "lower");

const gpuBytes = (run) => (run?.sampled_gpu_status === "unavailable" ? null : run?.sampled_gpu_process_bytes);

/** E3: the larger train batch (b2) compared with the smaller one (b1). */
export function e3Takeaway(results) {
  const runs = [...(results?.tables?.E3 ?? [])].sort((a, b) => a.train_batch_size - b.train_batch_size);
  if (runs.length < 2) return t("MISSING");
  const [small, large] = [runs[0], runs.at(-1)];
  const unit = byteDisplayUnit([gpuBytes(small), gpuBytes(large)]);
  const time = (run) => formatSeconds(run.train_seconds_including_sequence_io).text;
  const gpu = (run) => formatBytes(gpuBytes(run), unit).text;
  const recall = (run) => formatRatio(run["Recall@20"]).text;
  const dt = compare(large.train_seconds_including_sequence_io, small.train_seconds_including_sequence_io);
  const dg = compare(gpuBytes(large), gpuBytes(small));
  const dr = compare(large["Recall@20"], small["Recall@20"]);
  if (!decided(dt, dg, dr)) {
    return t("e3_takeaway_neutral", large.train_batch_size, time(large), gpu(large), recall(large),
      small.train_batch_size, time(small), gpu(small), recall(small));
  }
  return t("e3_takeaway", large.train_batch_size, timeWord(dt), time(large), time(small),
    amountWord(dg), gpu(large), gpu(small), scoreWord(dr), recall(large), recall(small));
}

/** E3 subtitle values: the two train batch sizes and the model, all from JSON. */
export function e3Subtitle(results) {
  const runs = [...(results?.tables?.E3 ?? [])].sort((a, b) => a.train_batch_size - b.train_batch_size);
  if (runs.length < 2) return t("MISSING");
  return t("e3_subtitle", modelLabel(runs[0].model), runs[0].train_batch_size, runs.at(-1).train_batch_size);
}

/** Hardware named in the limitation note, read from the package environment; null when absent. */
export function e3Hardware(results) {
  const vm = results?.vm_environment ?? {};
  const gpu = typeof vm.gpu === "string" ? vm.gpu.split(" (")[0].trim() : null;
  const parts = [vm.cloud, gpu].filter((value) => typeof value === "string" && value.trim());
  return parts.length ? parts.join(" · ") : null;
}

export function e3Limitation(results) {
  const hardware = e3Hardware(results);
  return hardware ? t("e3_limit", hardware) : t("e3_limit_no_hardware");
}

/** Display label of a storage format ("csv" -> "CSV", "parquet" -> "Parquet"). */
export function formatLabel(format) {
  const key = `format_${String(format ?? "").toLowerCase()}`;
  return Object.hasOwn(messages.en, key) ? t(key) : String(format ?? t("MISSING")).toUpperCase();
}

/** E4 rows ordered [baseline, subject]: CSV first and Parquet as the sentence subject when present. */
export function e4Pair(results) {
  const runs = results?.tables?.E4 ?? [];
  const csv = runs.find((run) => String(run.format).toLowerCase() === "csv") ?? runs[0];
  const parquet = runs.find((run) => String(run.format).toLowerCase() === "parquet") ?? runs.find((run) => run !== csv);
  return csv && parquet ? [csv, parquet] : null;
}

/** E4: Parquet (s2/r2/p2) compared with CSV (s1/r1/p1). */
export function e4Takeaway(results) {
  const pair = e4Pair(results);
  if (!pair) return t("MISSING");
  const [base, subject] = pair;
  const size = (run) => formatBytes(run.bytes, "MiB").text;
  const read = (run) => formatSeconds(run.read_seconds).text;
  const prep = (run) => formatSeconds(run.preprocessing_wall_seconds_including_read).text;
  const ds = compare(subject.bytes, base.bytes);
  const dr = compare(subject.read_seconds, base.read_seconds);
  const dp = compare(subject.preprocessing_wall_seconds_including_read, base.preprocessing_wall_seconds_including_read);
  if (!decided(ds, dr)) {
    return t("e4_takeaway_neutral", formatLabel(subject.format), size(subject), read(subject), prep(subject),
      formatLabel(base.format), size(base), read(base), prep(base));
  }
  const head = [formatLabel(subject.format), sizeWord(ds), size(subject), size(base), timeWord(dr), read(subject), read(base)];
  if (isSimilar(subject.preprocessing_wall_seconds_including_read, base.preprocessing_wall_seconds_including_read)) {
    const because = isSmallPart(subject.read_seconds, subject.preprocessing_wall_seconds_including_read)
      && isSmallPart(base.read_seconds, base.preprocessing_wall_seconds_including_read) ? t("e4_because") : "";
    return t("e4_takeaway_similar", ...head, prep(subject), prep(base), because);
  }
  if (!decided(dp)) return t("e4_takeaway_similar", ...head, prep(subject), prep(base), "");
  return t("e4_takeaway_differs", ...head, timeWord(dp), prep(subject), prep(base));
}

export function e4Subtitle(results) {
  const pair = e4Pair(results);
  if (!pair) return t("MISSING");
  const [base, subject] = pair;
  const count = (run) => formatCount(run.n_events).text;
  return base.n_events === subject.n_events
    ? t("e4_subtitle", count(base))
    : t("e4_subtitle_counts", count(base), count(subject));
}
