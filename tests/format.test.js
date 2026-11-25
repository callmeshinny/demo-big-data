import test from "node:test";
import assert from "node:assert/strict";
import {
  formatBytes, formatCount, formatMsPerSession, formatPercent, formatRatio,
  formatSeconds, formatSessionsPerSecond,
} from "../src/format.js";

test("formats ratios and preserves the raw value", () => {
  assert.deepEqual(formatRatio(0.08676140613313388), { text: "0.0868", raw: "0.08676140613313388" });
  assert.equal(formatRatio(0.6309297535714575).text, "0.6309");
  assert.equal(formatRatio(0).text, "0.0000");
});

test("formats seconds by magnitude", () => {
  assert.equal(formatSeconds(432.6).text, "432.6 s");
  assert.equal(formatSeconds(28.132).text, "28.13 s");
  assert.equal(formatSeconds(0.7025).text, "0.703 s");
});

test("formats other official display units", () => {
  assert.equal(formatMsPerSession(0.52549).text, "0.525 ms/session");
  assert.equal(formatSessionsPerSecond(12.34).text, "12.3");
  assert.equal(formatBytes(134004153).text, "127.8 MiB");
  assert.equal(formatBytes(7977566208).text, "7.43 GiB");
  assert.equal(formatCount(882808).text, "882,808");
  assert.equal(formatPercent(48.58634).text, "48.59%");
});

test("missing values use localized MISSING text and retain raw tooltip values", () => {
  assert.deepEqual(formatRatio(null), { text: "Not available", raw: "null" });
  assert.equal(formatRatio(undefined).text, "Not available");
});
