import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { t } from "./i18n.js";
import { barLayout, nextMarkIndex, toggleSelection } from "./chart-math.js";
import { chartLayout } from "./scaling.js";
import { formatCount } from "./format.js";
import { usePresenter } from "./presenter.js";

/*
 * Interactive hand-written SVG charts (no chart library).
 * - Hover/focus: preview highlight + glass tooltip. Click/tap or Enter/Space: select; other marks dim.
 *   Click again or Esc clears. Arrow keys move between marks. Every mark has a >= 44 x 44 px hit area.
 * - Selection is owned by the experiment panel, so the matching table column highlights too.
 * - A point is { key, label, y, short, display, raw, runId, source, colour, x? }. Charts never add series
 *   that are not in the JSON; values arrive pre-formatted by src/format.js.
 */

/** Width of an element in CSS pixels, so the chart draws text at its real size. */
export function useWidth(fallback) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);
  // Measure before the first paint so the chart never draws wider than its frame.
  useLayoutEffect(() => {
    const measured = ref.current?.getBoundingClientRect().width;
    if (measured) setWidth(Math.max(240, Math.floor(measured)));
  }, []);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.floor(entry.contentRect.width))));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

function Tooltip({ point, metric, anchor, frameWidth }) {
  const ref = useRef(null);
  const [box, setBox] = useState({ left: 0, top: 0, below: false });
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || !anchor) return;
    const width = node.offsetWidth, height = node.offsetHeight;
    const left = Math.min(Math.max(4, anchor.x - width / 2), Math.max(4, frameWidth - width - 4));
    const below = anchor.y - height - 12 < 0;
    setBox({ left, top: below ? anchor.y + 16 : anchor.y - height - 12, below });
  }, [anchor?.x, anchor?.y, frameWidth, point?.key]);
  if (!point) return null;
  return <div ref={ref} className="tooltip glass" role="status" style={{ left: box.left, top: box.top }}>
    <strong>{point.label}</strong>
    <span>{metric}: <b>{point.display}</b></span>
    <span>{t("tooltip_raw")}: <code>{point.raw}</code></span>
    {point.unit && <span>{t("tooltip_unit")}: {point.unit}</span>}
    {point.runId && <span>{t("tooltip_run")}: <code>{point.runId}</code></span>}
    {point.source && <span>{t("tooltip_source")}: <code>{point.source}</code></span>}
  </div>;
}

function useMarks(points, selected, onSelect) {
  const marks = useRef([]);
  const [hover, setHover] = useState(null);
  const handlers = (point, index) => ({
    "data-mark": point.key,
    role: "button",
    tabIndex: 0,
    "aria-pressed": selected === point.key,
    onClick: () => onSelect(toggleSelection(selected, point.key)),
    onMouseEnter: () => setHover(point.key),
    onMouseLeave: () => setHover(null),
    onFocus: () => setHover(point.key),
    onBlur: () => setHover(null),
    onKeyDown: (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect(toggleSelection(selected, point.key));
        return;
      }
      if (event.key === "Escape") {
        onSelect(null);
        return;
      }
      const next = nextMarkIndex(index, event.key, points.length);
      if (next !== null) {
        event.preventDefault();
        marks.current[next]?.focus();
      }
    },
    ref: (node) => { marks.current[index] = node; },
  });
  const shown = points.find((point) => point.key === hover) ?? points.find((point) => point.key === selected) ?? null;
  return { handlers, hover, shown };
}

function markClass(point, selected, hover) {
  return ["mark-group", selected === point.key && "is-selected", hover === point.key && "is-hover"].filter(Boolean).join(" ");
}

const describe = (metric, point) => `${point.label}, ${metric}: ${point.display}`;

export function BarChart({ title, metric, yLabel, points, selected, onSelect }) {
  const presenter = usePresenter();
  const [ref, width] = useWidth(480);
  const fontSize = presenter ? 16 : 13;
  const height = presenter ? 300 : 250;
  const layout = barLayout(points, { width, height, fontSize });
  const { padding } = layout;
  const { handlers, hover, shown } = useMarks(points, selected, onSelect);
  const anchorBar = layout.bars.find((bar) => bar.key === shown?.key);
  return <figure className={`chart${selected != null ? " has-selection" : ""}`}>
    <figcaption>{title}</figcaption>
    <div ref={ref} className="chart-frame">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="group" aria-label={`${title}. ${yLabel}`} style={{ fontSize }}>
        {layout.ticks.map((tick) => <g key={tick.value}>
          <line x1={padding.left} y1={tick.cy} x2={padding.right} y2={tick.cy} className="chart-gridline" />
          <text x={tick.x} y={tick.cy + fontSize * 0.35} textAnchor="end" className="chart-tick">{tick.text}</text>
        </g>)}
        <line x1={padding.left} y1={padding.bottom} x2={padding.right} y2={padding.bottom} className="chart-axis" />
        <text x={layout.yTitle.x} y={layout.yTitle.y} textAnchor="middle" transform={`rotate(-90 ${layout.yTitle.x} ${layout.yTitle.y})`} className="chart-axis-label">{yLabel}</text>
        {layout.bars.map((bar, index) => <g key={bar.key} className={markClass(bar, selected, hover)} aria-label={describe(metric, bar)} {...handlers(bar, index)}>
          <rect className="hit" x={bar.hit.x} y={bar.hit.y} width={bar.hit.width} height={bar.hit.height} rx="8" />
          {bar.has && <rect className={`mark bar model-${bar.colour ?? "neutral"}`} x={bar.x} y={bar.top} width={bar.width} height={Math.max(1, bar.height)} rx="4" />}
          {bar.valueLabel.visible && <text className="chart-value" x={bar.valueLabel.x} y={bar.valueLabel.y} textAnchor="middle">{bar.valueLabel.text}</text>}
          {bar.lines.map((line) => <text key={line.y} className="chart-category" x={line.x} y={line.y} textAnchor="middle">{line.text}</text>)}
        </g>)}
      </svg>
      <Tooltip point={shown} metric={metric} anchor={anchorBar ? { x: anchorBar.cx, y: anchorBar.top } : null} frameWidth={width} />
    </div>
  </figure>;
}

export function LineChart({ title, metric, yLabel, xLabel, points, selected, onSelect, colour = "gru" }) {
  const presenter = usePresenter();
  const [ref, width] = useWidth(520);
  const fontSize = presenter ? 16 : 13;
  const height = presenter ? 320 : width < 420 ? 260 : 290;
  const series = points.map((point) => ({ ...point, runId: point.key }));
  const layout = chartLayout(series, { width, height, fontSize, formatValue: (value) => ({ text: points.find((p) => p.y === value)?.short ?? String(value) }), formatX: (value) => formatCount(value).text });
  const { padding } = layout;
  const placed = layout.points.map((point) => ({ ...points.find((p) => p.key === point.runId), cx: point.cx, cy: point.cy }));
  const { handlers, hover, shown } = useMarks(placed, selected, onSelect);
  const anchor = placed.find((point) => point.key === shown?.key);
  const path = placed.map((point, index) => `${index ? "L" : "M"}${point.cx},${point.cy}`).join(" ");
  return <figure className={`chart${selected != null ? " has-selection" : ""}`}>
    <figcaption>{title}</figcaption>
    <div ref={ref} className="chart-frame">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="group" aria-label={`${title}. ${yLabel}`} style={{ fontSize }}>
        {layout.ticks.map((tick) => <g key={tick.key}>
          <line x1={padding.left} y1={tick.cy} x2={padding.right} y2={tick.cy} className="chart-gridline" />
          {tick.visible && <text x={tick.x} y={tick.y} textAnchor="end" className="chart-tick">{tick.text}</text>}
        </g>)}
        <line x1={padding.left} y1={padding.bottom} x2={padding.right} y2={padding.bottom} className="chart-axis" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.bottom} className="chart-axis" />
        <text x={layout.xTitle.x} y={layout.xTitle.y} textAnchor="middle" className="chart-axis-label">{xLabel}</text>
        <text x={layout.yTitle.x} y={layout.yTitle.y} textAnchor="middle" transform={`rotate(-90 ${layout.yTitle.x} ${layout.yTitle.y})`} className="chart-axis-label">{yLabel}</text>
        {layout.xLabels.map((label) => label.visible && <text key={label.key} x={label.x} y={label.y} textAnchor="middle" className="chart-tick">{label.text}</text>)}
        <path d={path} className={`chart-line model-${colour}`} />
        {placed.map((point, index) => <g key={point.key} className={markClass(point, selected, hover)} aria-label={describe(metric, point)} {...handlers(point, index)}>
          <rect className="hit" x={point.cx - 22} y={point.cy - 22} width="44" height="44" rx="22" />
          <circle className={`mark chart-point model-${colour}`} cx={point.cx} cy={point.cy} r="6" />
          {layout.pointLabels[index]?.visible && <text x={layout.pointLabels[index].x} y={layout.pointLabels[index].y} textAnchor={layout.pointLabels[index].anchor} className="chart-value">{layout.pointLabels[index].text}</text>}
        </g>)}
      </svg>
      <Tooltip point={shown} metric={metric} anchor={anchor ? { x: anchor.cx, y: anchor.cy } : null} frameWidth={width} />
    </div>
  </figure>;
}

/** Panel-level selection: shared by every chart and the table in one experiment panel; Esc clears. */
export function useSelection(initial = null) {
  const [selected, setSelected] = useState(initial);
  useEffect(() => {
    if (selected == null) return undefined;
    const onKey = (event) => { if (event.key === "Escape") setSelected(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected]);
  return [selected, setSelected];
}
