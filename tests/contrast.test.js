// WCAG 2 contrast for the design tokens in src/styles.css, light and dark.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

function tokens(block) {
  return Object.fromEntries([...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6});/gi)].map(([, name, hex]) => [name, hex.toLowerCase()]));
}

const lightBlock = css.slice(css.indexOf(":root {"), css.indexOf("@media (prefers-color-scheme: dark)"));
const darkStart = css.indexOf("@media (prefers-color-scheme: dark)");
const darkBlock = css.slice(darkStart, css.indexOf("@media (prefers-contrast: more)", darkStart));
const themes = { light: tokens(lightBlock), dark: { ...tokens(lightBlock), ...tokens(darkBlock) } };

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function ratio(a, b) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

const PAIRS = [
  // [foreground, background, minimum, what]
  ["label", "bg", 4.5, "body text on page"],
  ["label", "surface", 4.5, "body text on card"],
  ["label-2", "bg", 4.5, "secondary / footnote text on page"],
  ["label-2", "surface", 4.5, "secondary / footnote text on card"],
  ["label", "fill", 4.5, "neutral tag text"],
  ["label", "segment", 4.5, "selected segment text"],
  ["positive", "positive-bg", 4.5, "positive text on its pale background"],
  ["negative", "negative-bg", 4.5, "negative text on its pale background"],
  ["caution", "caution-bg", 4.5, "caution text on its pale background"],
  ["positive", "surface", 4.5, "positive text on card"],
  ["negative", "surface", 4.5, "negative text on card"],
  ["caution", "surface", 4.5, "caution text on card"],
  ["control-border", "surface", 3, "control boundary (WCAG 1.4.11)"],
  ["control-border", "bg", 3, "control boundary on page (WCAG 1.4.11)"],
  ["accent", "surface", 4.5, "accent text on card"],
  ["accent", "bg", 4.5, "accent text on page"],
];

for (const [scheme, theme] of Object.entries(themes)) {
  test(`${scheme} tokens meet contrast minimums`, () => {
    for (const name of ["bg", "surface", "label", "label-2", "separator", "control-border", "accent", "fill", "segment", "positive", "positive-bg", "negative", "negative-bg", "caution", "caution-bg"]) {
      assert.match(theme[name] ?? "", /^#[0-9a-f]{6}$/, `${scheme}: --${name} must be a hex token`);
    }
    const failures = PAIRS.map(([fg, bg, minimum, what]) => ({ what, fg, bg, minimum, value: ratio(theme[fg], theme[bg]) }))
      .filter(({ value, minimum }) => value < minimum)
      .map(({ what, fg, bg, minimum, value }) => `${what}: --${fg} on --${bg} = ${value.toFixed(2)}:1 < ${minimum}:1`);
    assert.deepEqual(failures, [], scheme);
  });
}

test("type scale has exactly five steps and nothing below 13 px", () => {
  const sizes = new Set([...css.matchAll(/--t-[a-z]+:\s*\d+\s+(\d+)px\//g)].map(([, size]) => Number(size)));
  assert.deepEqual([...sizes].sort((a, b) => a - b), [13, 16, 17, 22, 28]);
  const literal = [...css.matchAll(/font(?:-size)?:\s*[^;]*?(\d+(?:\.\d+)?)(px|rem|em)\b/g)]
    .filter(([match]) => !match.includes("var(--"))
    .map(([match]) => match);
  assert.deepEqual(literal, [], "font sizes must come from the type tokens");
});
