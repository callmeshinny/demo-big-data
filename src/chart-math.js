// Pure helpers for the hand-written SVG charts and their selection state (tested with node --test).

/** Round axis: 0 … niceMax in 3–5 equal "nice" steps (1, 2, 2.5, 5 × 10^n). The axis always starts at 0. */
export function niceTicks(maxValue, target = 4) {
  const max = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 1;
  const raw = max / target;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const residual = raw / magnitude;
  const nice = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 2.5 ? 2.5 : residual <= 5 ? 5 : 10;
  const step = nice * magnitude;
  const count = Math.ceil(max / step - 1e-9);
  const ticks = Array.from({ length: count + 1 }, (_, index) => Number((index * step).toPrecision(12)));
  return { step, max: ticks.at(-1), ticks };
}

/** Tick text with just enough decimals for the step; a tick is a number only (the unit is in the axis title). */
export function formatTick(value, step) {
  if (value === 0) return "0";
  const magnitude = 10 ** Math.floor(Math.log10(step) + 1e-9);
  const lead = Math.round((step / magnitude) * 10) / 10;
  const decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9) + (lead === 2.5 ? 1 : 0));
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// Glyph width as a share of font size; 0.62 leaves a margin over typical proportional and mono fonts.
export const GLYPH = 0.62;
export function textWidth(text, fontSize) {
  return String(text).length * fontSize * GLYPH;
}

/** Split a label into at most two lines that fit `maxWidth`; the last line is ellipsized if needed. */
export function wrapLabel(text, maxWidth, fontSize) {
  const label = String(text);
  if (textWidth(label, fontSize) <= maxWidth) return [label];
  const words = label.split(/\s+/);
  const lines = [""];
  for (const word of words) {
    const candidate = lines.at(-1) ? `${lines.at(-1)} ${word}` : word;
    if (textWidth(candidate, fontSize) <= maxWidth || !lines.at(-1)) lines[lines.length - 1] = candidate;
    else lines.push(word);
  }
  const two = lines.length > 2 ? [lines[0], lines.slice(1).join(" ")] : lines;
  return two.map((line) => {
    if (textWidth(line, fontSize) <= maxWidth) return line;
    const keep = Math.max(1, Math.floor(maxWidth / (fontSize * GLYPH)) - 1);
    return `${line.slice(0, keep)}…`;
  });
}

/** Selection: clicking the selected mark again clears it. */
export function toggleSelection(selected, key) {
  return selected === key ? null : key;
}

/** Arrow-key movement between marks (wraps around). Returns the new index, or null for other keys. */
export function nextMarkIndex(index, key, length) {
  if (!length) return null;
  if (key === "ArrowRight" || key === "ArrowDown") return (index + 1) % length;
  if (key === "ArrowLeft" || key === "ArrowUp") return (index - 1 + length) % length;
  if (key === "Home") return 0;
  if (key === "End") return length - 1;
  return null;
}

/**
 * Bar chart geometry at the real pixel width. Bars start at zero; the left margin follows the longest
 * tick so labels like "327.5" are never clipped. Category labels wrap to two lines; value labels that
 * do not fit their band are hidden (the value stays in the tooltip and the table).
 */
export function barLayout(points, { width = 480, height = 240, fontSize = 13 } = {}) {
  const values = points.map((point) => point.y).filter((value) => Number.isFinite(value));
  const axis = niceTicks(Math.max(0, ...values));
  const tickTexts = axis.ticks.map((value) => formatTick(value, axis.step));
  const longestTick = Math.max(...tickTexts.map((text) => textWidth(text, fontSize)));
  const titleBand = fontSize * 1.6;
  const lineHeight = Math.round(fontSize * 1.25);
  const padding = {
    left: Math.ceil(titleBand + longestTick + 10),
    right: width - 12,
    top: Math.ceil(fontSize * 2 + 4),
    bottom: height - Math.ceil(lineHeight * 2 + 14),
  };
  const plot = padding.bottom - padding.top;
  const band = (padding.right - padding.left) / Math.max(1, points.length);
  const barWidth = Math.max(16, Math.min(64, band * 0.56));
  const y = (value) => padding.bottom - (value / axis.max) * plot;
  const bars = points.map((point, index) => {
    const cx = padding.left + band * (index + 0.5);
    const has = Number.isFinite(point.y);
    const top = has ? y(point.y) : padding.bottom;
    const valueText = point.short ?? "";
    const valueFits = has && textWidth(valueText, fontSize) <= band - 4;
    const hitWidth = Math.max(44, Math.min(band - 2, barWidth + 16));
    const hitTop = Math.min(top - fontSize - 6, padding.bottom - 44);
    return {
      ...point,
      index,
      cx,
      x: cx - barWidth / 2,
      width: barWidth,
      top,
      height: padding.bottom - top,
      has,
      valueLabel: { x: cx, y: top - 6, text: valueText, visible: valueFits },
      lines: wrapLabel(point.label, band - 4, fontSize).map((text, line) => ({ text, x: cx, y: padding.bottom + lineHeight * (line + 1) })),
      hit: { x: cx - hitWidth / 2, y: hitTop, width: hitWidth, height: padding.bottom - hitTop + 4 },
    };
  });
  const ticks = axis.ticks.map((value, index) => ({ value, cy: y(value), text: tickTexts[index], x: padding.left - 8 }));
  return { width, height, fontSize, padding, axis, ticks, bars, yTitle: { x: fontSize + 2, y: (padding.top + padding.bottom) / 2 } };
}
