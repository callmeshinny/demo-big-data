import React from "react";
import { t } from "./i18n.js";
import { formatValue } from "./data.js";
import { configurationRows, runtimeRows } from "./run-config.js";

function ConfigRun({ runId, config }) {
  const rows = configurationRows(config);
  const runtimeFields = runtimeRows(config);
  const catalogSha = config?.catalog_sha256 ?? null;
  const sourceMetrics = config?.source_metrics ?? null;
  return <section className="config-run">
    <h3><code>{runId}</code></h3>
    <div className="table-scroll"><table className="config-table">
      <thead><tr><th scope="col">{t("parameter")}</th><th scope="col">{t("planned")}</th><th scope="col">{t("actual")}</th><th scope="col">{t("comparison")}</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.key} className={row.differs ? "diff" : ""}>
        <th scope="row">{row.label}</th>
        <td title={row.plannedRaw}>{row.planned}</td>
        <td title={row.actualRaw}>{row.actual}</td>
        <td>{row.differs && <span className="tag tag-diff">{t("differs")}</span>}</td>
      </tr>)}</tbody>
    </table></div>
    <h4>{t("environment")}</h4>
    <dl className="env config-runtime">{runtimeFields.map(({ key, label, value }) => <div key={key}>
      <dt>{label}</dt><dd title={value == null ? undefined : String(value)}>{formatValue(value)}</dd>
    </div>)}</dl>
    <ul className="sources">
      <li><span>{t("catalog_sha_short")}:</span> <code title={catalogSha ?? undefined}>{catalogSha ? catalogSha.slice(0, 12) : t("MISSING")}</code></li>
      <li><span>{t("source_metrics")}:</span> <code title={sourceMetrics ?? undefined}>{sourceMetrics ?? t("MISSING")}</code></li>
    </ul>
  </section>;
}

export function PanelConfigDetails({ results, runIds }) {
  return <details className="config config-bundle">
    <summary>{t("configuration_and_sources")}</summary>
    {runIds.map((runId) => <ConfigRun key={runId} runId={runId} config={results?.configs?.[runId]} />)}
  </details>;
}

export function EnvironmentCard({ results }) {
  const e1Runs = results?.tables?.E1 ?? [];
  const candidates = e1Runs.map((run) => results?.configs?.[run.run_id]?.runtime).filter(Boolean);
  const valueFor = (key, packageKey) => candidates.map((runtime) => packageKey ? runtime.packages?.[packageKey] : runtime[key]).find((value) => value !== null && value !== undefined);
  const rows = [
    [t("runtime_gpu"), valueFor("gpu")], [t("runtime_cuda"), valueFor("cuda")], [t("runtime_python"), valueFor("python")],
    [t("runtime_torch"), valueFor(null, "torch")], [t("runtime_transformers4rec"), valueFor(null, "transformers4rec")],
    [t("cost"), t("not_measured")],
  ];
  return <section className="panel environment-card">
    <h2>{t("environment")}</h2>
    <dl className="env">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? t("MISSING")}</dd></div>)}</dl>
  </section>;
}
