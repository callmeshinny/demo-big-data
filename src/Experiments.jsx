import React, { useEffect, useRef, useState } from "react";
import { t } from "./i18n.js";
import { EXPERIMENTS } from "./data.js";
import { DataLoadFailure, InterpretationNote, Notice } from "./ui.jsx";
import { buildE1View, formatE1Context } from "./e1.js";
import { buildE3E4View, buildScalingView, chartLayout, formatE3Context } from "./scaling.js";
import { formatCount, formatSeconds } from "./format.js";
import { EnvironmentCard, PanelConfigDetails } from "./RunConfigDetails.jsx";
import { experimentHref } from "./navigation.js";

function OfficialE1Panel({ results }) {
  const view = buildE1View(results);
  return <section className="panel e1-panel">
    <div className="panel-heading"><h2>{t("e1_model_comparison")}</h2></div>
    <p className="e1-context">{formatE1Context(view.context)}</p>
    <div className="table-scroll"><table className="metric-table e1-table">
      <caption className="sr-only">{t("e1_model_comparison")}</caption>
      <thead><tr><th scope="col">{t("metric")}</th>{view.models.map(({ label }) => <th scope="col" key={label}>{label}</th>)}</tr></thead>
      <tbody>{view.rows.map((row) => <tr key={row.field}>
        <th scope="row">{row.label}</th>{row.cells.map((cell, index) => <td key={`${row.field}/${index}`} title={cell.raw} className={cell.text === t("MISSING") ? "missing" : "num"}>{cell.text}</td>)}
      </tr>)}</tbody>
    </table></div>
    <aside className="e1-footnotes">
      <p>{t("e1_fair_statement")}</p>
      <ul>{view.notes.map(({ label, dictionaryKey }) => <li key={dictionaryKey}><strong>{label}:</strong> <InterpretationNote dictionaryKey={dictionaryKey} /></li>)}</ul>
    </aside>
    <PanelConfigDetails results={results} runIds={view.models.map(({ run }) => run?.run_id).filter(Boolean)} />
  </section>;
}

function OfficialE2Panel({ results }) {
  const { e2Table } = buildScalingView(results);
  return <section className="panel scaling-panel">
    <div className="panel-heading"><h2>{t("e2_effect_of_dataset_size")}</h2></div>
    <div className="table-scroll"><table className="metric-table scaling-table">
      <caption className="sr-only">{t("e2_effect_of_dataset_size")}</caption>
      <thead><tr><th scope="col">{t("metric")}</th>{e2Table.columns.map((column) => <th scope="col" key={column.runId}>
        <strong>{column.subset}%</strong><span className="column-subtitle" title={column.events.raw}>{column.events.text} {t("events")}</span>
      </th>)}</tr></thead>
      <tbody>{e2Table.rows.map((row, rowIndex) => <tr key={row.field}>
        <th scope="row">{row.label}</th>{e2Table.columns.map((column) => {
          const cell = column.cells[rowIndex];
          return <td key={`${row.field}/${column.runId}`} title={cell.raw} className={cell.text === t("MISSING") ? "missing" : "num"}>{cell.text}</td>;
        })}
      </tr>)}</tbody>
    </table></div>
    <p className="scaling-shared"><strong title={String(e2Table.firstSeen)}>{t("e2_first_seen_shared", formatSeconds(e2Table.firstSeen).text)}</strong></p>
    <InterpretationNote dictionaryKey="first_seen_shared" />
    <InterpretationNote dictionaryKey="E2_accuracy" />
    <PanelConfigDetails results={results} runIds={e2Table.columns.map(({ runId }) => runId)} />
  </section>;
}

/** Width of an element in CSS pixels, so the chart draws text at its real size. */
function useWidth(fallback) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.floor(entry.contentRect.width))));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

function E5Chart({ chart }) {
  const [ref, width] = useWidth(600);
  const height = width < 420 ? 260 : 300;
  const layout = chartLayout(chart.series, { width, height, formatValue: chart.formatValue });
  const { padding, points } = layout;
  const path = points.map((point, index) => `${index ? "L" : "M"}${point.cx},${point.cy}`).join(" ");
  return <figure className="scaling-chart">
    <figcaption>{chart.title}</figcaption>
    <div ref={ref} className="chart-frame">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${chart.title}. ${chart.yLabel}`}>
        {layout.ticks.map((tick) => <g key={tick.key}>
          <line x1={padding.left} y1={tick.cy} x2={padding.right} y2={tick.cy} className="chart-gridline" />
          {tick.visible && <text x={tick.x} y={tick.y} textAnchor="end" className="chart-tick">{tick.text}</text>}
        </g>)}
        <line x1={padding.left} y1={padding.bottom} x2={padding.right} y2={padding.bottom} className="chart-axis" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.bottom} className="chart-axis" />
        <text x={layout.xTitle.x} y={layout.xTitle.y} textAnchor="middle" className="chart-axis-label">{t("e5_x_axis_events")}</text>
        <text x={layout.yTitle.x} y={layout.yTitle.y} textAnchor="middle" transform={`rotate(-90 ${layout.yTitle.x} ${layout.yTitle.y})`} className="chart-axis-label">{chart.yLabel}</text>
        {layout.xLabels.map((label) => label.visible && <text key={label.key} x={label.x} y={label.y} textAnchor="middle" className="chart-tick">{label.text}</text>)}
        <path d={path} className="chart-line" />
        {points.map((point, index) => <g key={point.runId}>
          <circle cx={point.cx} cy={point.cy} r="5" className="chart-point"><title>{`${formatCount(point.x).text} · ${chart.formatValue(point.y).text} · ${point.runId}`}</title></circle>
          {layout.pointLabels[index].visible && <text x={layout.pointLabels[index].x} y={layout.pointLabels[index].y} textAnchor={layout.pointLabels[index].anchor} className="chart-value">{layout.pointLabels[index].text}</text>}
        </g>)}
      </svg>
    </div>
  </figure>;
}

function OfficialE5Panel({ results }) {
  const { e5Table, charts, registrySummary } = buildScalingView(results);
  return <section className="panel scaling-panel">
    <div className="panel-heading"><h2>{t("e5_scalability")}</h2></div>
    {results.E5_aggregation_only === true && <InterpretationNote dictionaryKey="E5_derived_from_E2" source={t("source_metrics_flag", "E5_aggregation_only")} />}
    {registrySummary && <p className="registry-summary">{t(
      "run_registry_summary",
      registrySummary.passed,
      registrySummary.derived_from_verified_E2,
      registrySummary.excluded,
    )}</p>}
    <div className="table-scroll"><table className="metric-table scaling-table e5-table">
      <caption className="sr-only">{t("e5_scalability")}</caption>
      <thead><tr><th scope="col">{t("metric")}</th>{e5Table.columns.map((column) => <th scope="col" key={column.runId}>{column.subset}%</th>)}</tr></thead>
      <tbody>{e5Table.rows.map((row) => <tr key={row.field}>
        <th scope="row">{row.label}</th>{row.cells.map((cell, index) => <td key={`${row.field}/${index}`} title={cell.raw} className={cell.text === t("MISSING") ? "missing" : row.field === "bottleneck" ? "stage-value" : "num"}>{cell.text}</td>)}
      </tr>)}</tbody>
    </table></div>
    <div className="scaling-charts">{charts.map((chart) => <E5Chart key={chart.id} chart={chart} />)}</div>
    <InterpretationNote dictionaryKey="E5_composed" />
    <PanelConfigDetails results={results} runIds={e5Table.columns.map(({ runId }) => runId)} />
  </section>;
}

function OfficialE3Panel({ results }) {
  const { e3 } = buildE3E4View(results);
  return <section className="panel scaling-panel">
    <div className="panel-heading"><h2>{t("e3_effect_of_resources")}</h2></div>
    <p className="e1-context">{formatE3Context(e3.context)}</p>
    <div className="table-scroll"><table className="metric-table e3-table">
      <caption className="sr-only">{t("e3_effect_of_resources")}</caption>
      <thead><tr><th scope="col">{t("metric")}</th>{e3.models.map((run) => <th scope="col" key={run.runId}>{t("e3_train_batch_header", run.batchSize)}</th>)}</tr></thead>
      <tbody>{e3.rows.map((row, rowIndex) => <tr key={row.field}>
        <th scope="row">{row.label}</th>{e3.models.map((run) => {
          const cell = run.cells[rowIndex];
          return <td key={`${row.field}/${run.runId}`} title={cell.raw} className={cell.text === t("MISSING") ? "missing" : "num"}>{cell.text}</td>;
        })}
      </tr>)}</tbody>
    </table></div>
    <InterpretationNote dictionaryKey="inference_protocol" />
    <InterpretationNote dictionaryKey="E3_accuracy" />
    <PanelConfigDetails results={results} runIds={e3.models.map(({ runId }) => runId)} />
  </section>;
}

function OfficialE4Panel({ results }) {
  const { e4 } = buildE3E4View(results);
  return <section className="panel scaling-panel">
    <div className="panel-heading"><h2>{t("experiment_e4_csv_vs_parquet")}</h2></div>
    <div className="table-scroll"><table className="metric-table e4-table">
      <caption className="sr-only">{t("experiment_e4_csv_vs_parquet")}</caption>
      <thead><tr><th scope="col">{t("metric")}</th>{e4.formats.map((format) => <th scope="col" key={format.runId}>{format.label.toUpperCase()}</th>)}</tr></thead>
      <tbody>{e4.rows.map((row, rowIndex) => <tr key={row.field}>
        <th scope="row">{row.label}</th>{e4.formats.map((format) => {
          const cell = format.cells[rowIndex];
          return <td key={`${row.field}/${format.runId}`} title={cell.raw} className={cell.text === t("MISSING") ? "missing" : "num"}>{cell.text}</td>;
        })}
      </tr>)}</tbody>
    </table></div>
    <InterpretationNote dictionaryKey="E4_preprocessing_wall" />
    <section className="excluded-runs"><h3>{t("e4_excluded_runs")}</h3>
      <ul>{e4.excluded.map(([runId, reason]) => <li key={runId}><code>{runId}</code>: {reason}</li>)}</ul>
    </section>
    <PanelConfigDetails results={results} runIds={e4.formats.map(({ runId }) => runId)} />
  </section>;
}

export default function Experiments({ state, active, select = null }) {
  if (state.error) return <DataLoadFailure title={t("could_not_load_e1_e5_results")} detail={state.error} />;
  if (state.loading) return <p className="loading">{t("loading_data")}</p>;
  const results = state.results;
  if (!results) return <Notice kind="error" title={t("could_not_load_e1_e5_results")}>{t("MISSING")}</Notice>;
  return <>
    <EnvironmentCard results={results} />
    <nav className="segmented subtabs glass" aria-label={t("experiment_subnav")}>{EXPERIMENTS.map((id) => (
      <a key={id} href={experimentHref(id)} aria-current={id === active ? "page" : undefined}>
        <span className="subtab-label"><strong>{id}</strong> · {t(`experiment_nav_${id.toLowerCase()}`)}</span>
      </a>
    ))}</nav>
    {active === "E1" ? <OfficialE1Panel results={results} />
      : active === "E2" ? <OfficialE2Panel results={results} />
        : active === "E3" ? <OfficialE3Panel results={results} />
          : active === "E4" ? <OfficialE4Panel results={results} />
            : <OfficialE5Panel results={results} />}
  </>;
}
