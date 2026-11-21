import React from "react";
import specs from "../scripts/figure_specs.json";
import { exactValue, MISSING } from "./data.js";
import { figureRows } from "./figures.js";

function Chart({ title, runs, metrics }) {
  const rows = figureRows(runs, metrics);
  const measured = rows.filter(({ value }) => value !== null);
  const units = [...new Set(measured.map(({ unit }) => unit).filter(Boolean))];
  const scopes = [...new Set(measured.map(({ scope }) => scope).filter(Boolean))];
  const runIds = [...new Set(rows.map(({ runId }) => runId))];
  const max = Math.max(0, ...measured.map(({ value }) => value));
  return (
    <figure className="metric-chart">
      <figcaption><strong>{title}</strong></figcaption>
      {measured.length === 0 ? <p>{MISSING}</p> : <>
        <p className="definition">Đơn vị trục {units.join(", ") || MISSING} · Phạm vi đo {scopes.join(" · ") || MISSING}</p>
        <ul className="bars">{rows.map(({ runId, metric, value }) => <li key={`${runId}/${metric}`}>
          <span><code>{runId}</code><small>{metric}</small></span>
          {value !== null && <meter min={0} max={max || 1} value={value} aria-label={`${runId} ${metric}`} />}
          <span>{value === null ? MISSING : exactValue(value)}</span>
        </li>)}</ul>
        <p className="definition">Run nguồn {runIds.join(" · ")}</p>
      </>}
    </figure>
  );
}

export default function ExperimentCharts({ experiment, runs }) {
  return specs[experiment].map(([id, title, metrics]) => <Chart key={id} title={title} runs={runs} metrics={metrics} />);
}
