import { t } from "./i18n.js";

/*
 * The one number formatter for the whole UI. Display rounding and MiB/GiB conversion only;
 * nothing is recomputed. Every formatter returns { text, raw }: `text` for the cell,
 * `raw` (the delivered value, unchanged) for the tooltip/title attribute.
 *
 *   Recall/NDCG (ratios) ... 4 decimals              0.6309297535714575 -> 0.6309
 *   times .................. 3 significant digits    1.5164 -> 1.52 s, 56.902 -> 56.9 s, 327.5 -> 328 s
 *   bytes .................. MiB or GiB, 1 decimal   134004153 -> 127.8 MiB
 *   counts ................. thousands separators    882808 -> 882,808
 *   null / undefined / "" / NaN / ±Infinity -> "Not available yet" / "Chưa có", never "NaN"
 */

const MISSING = () => t("MISSING");
const MIB = 1024 ** 2;
const GIB = 1024 ** 3;

export function isMissing(value) {
  if (value === null || value === undefined || value === "") return true;
  return typeof value === "number" && !Number.isFinite(value);
}

function result(value, text) {
  return { text, raw: String(value) };
}

function missing(value) {
  return { text: MISSING(), raw: String(value) };
}

function grouped(value, digits = 0) {
  return Number(value).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Three significant digits, never scientific notation; >= 1000 rounds to a grouped integer. */
export function significant3(value) {
  const number = Number(value);
  if (number === 0) return "0";
  if (Math.abs(number) >= 1000) return grouped(Math.round(number));
  const digits = Math.max(0, 2 - Math.floor(Math.log10(Math.abs(number))));
  const rounded = Number(number.toPrecision(3));
  // Rounding can carry over a power of ten (999.6 -> 1000); recompute the decimals from the result.
  const decimals = Math.abs(rounded) >= 1000 ? 0 : Math.max(0, 2 - Math.floor(Math.log10(Math.abs(rounded))));
  return grouped(rounded, Math.min(digits, decimals));
}

export function formatGeneralNumber(value) {
  if (isMissing(value)) return MISSING();
  if (Number.isInteger(value)) return grouped(value);
  return Number(value.toPrecision(4)).toLocaleString("en-US", { maximumFractionDigits: 10 });
}

export function formatRatio(value) {
  if (isMissing(value)) return missing(value);
  return result(value, Number(value).toFixed(4));
}

export function formatSeconds(value) {
  if (isMissing(value)) return missing(value);
  return result(value, `${significant3(value)} s`);
}

export function formatSecondsPerMillionEvents(value) {
  if (isMissing(value)) return missing(value);
  return result(value, `${significant3(value)} s/million events`);
}

export function formatMsPerSession(value) {
  if (isMissing(value)) return missing(value);
  return result(value, `${significant3(value)} ms/session`);
}

export function byteDisplayUnit(values) {
  return values.some((value) => typeof value === "number" && Number.isFinite(value) && value >= GIB) ? "GiB" : "MiB";
}

export function formatBytes(value, displayUnit) {
  if (isMissing(value)) return missing(value);
  const unit = displayUnit ?? byteDisplayUnit([value]);
  return result(value, `${(value / (unit === "GiB" ? GIB : MIB)).toFixed(1)} ${unit}`);
}

/** Same text without the unit, for cells whose unit is already in the row or column header. */
export function formatNumberOnly(formatter, value, displayUnit) {
  const formatted = formatter(value, displayUnit);
  if (isMissing(value)) return formatted;
  return { ...formatted, text: formatted.text.replace(/\s*(?:s\/million events|ms\/session|s|MiB|GiB|%)$/, "") };
}

export function formatScore(value) {
  if (isMissing(value)) return missing(value);
  return result(value, formatGeneralNumber(value));
}

export function formatCount(value) {
  if (isMissing(value)) return missing(value);
  return result(value, grouped(value));
}

export function formatPercent(value) {
  if (isMissing(value)) return missing(value);
  return result(value, `${Number(value).toFixed(2)}%`);
}

/** Distance-type ratios on the Dataset tab (e.g. total variation): 4 decimals like Recall/NDCG. */
export const formatDistance = formatRatio;
