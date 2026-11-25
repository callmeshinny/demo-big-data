import { t } from "./i18n.js";

const MISSING = () => t("MISSING");

export function formatGeneralNumber(value) {
  if (!Number.isFinite(value)) return String(value);
  if (Number.isInteger(value)) return value.toLocaleString("en-US");
  return Number(value.toPrecision(4)).toLocaleString("en-US", { maximumFractionDigits: 10 });
}

function result(value, formatted) {
  return { text: formatted, raw: String(value) };
}

function missing(value) {
  return value === null || value === undefined || value === "";
}

function fixed(value, digits) {
  return Number(value).toFixed(digits);
}

export function formatRatio(value) {
  if (missing(value)) return { text: MISSING(), raw: String(value) };
  return result(value, fixed(value, 4));
}

export function formatSeconds(value) {
  if (missing(value)) return { text: MISSING(), raw: String(value) };
  const digits = value >= 100 ? 1 : value >= 1 ? 2 : 3;
  return result(value, `${fixed(value, digits)} s`);
}

export function formatSecondsPerMillionEvents(value) {
  if (missing(value)) return { text: MISSING(), raw: String(value) };
  return result(value, `${fixed(value, 1)} s/million events`);
}

export function formatSecondsPerMillionEventsPoint(value) {
  if (missing(value)) return { text: MISSING(), raw: String(value) };
  return result(value, `${fixed(value, 1)} s`);
}

export function formatMsPerSession(value) {
  if (missing(value)) return { text: MISSING(), raw: String(value) };
  return result(value, `${fixed(value, 3)} ms/session`);
}

export function formatSessionsPerSecond(value) {
  if (missing(value)) return { text: MISSING(), raw: String(value) };
  return result(value, fixed(value, 1));
}

export function formatBytes(value) {
  if (missing(value)) return { text: MISSING(), raw: String(value) };
  const gib = 1024 ** 3;
  return value < gib
    ? result(value, `${fixed(value / (1024 ** 2), 1)} MiB`)
    : result(value, `${fixed(value / gib, 2)} GiB`);
}

export function formatCount(value) {
  if (missing(value)) return { text: MISSING(), raw: String(value) };
  return result(value, Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 }));
}

export function formatPercent(value) {
  if (missing(value)) return { text: MISSING(), raw: String(value) };
  return result(value, `${fixed(value, 2)}%`);
}
