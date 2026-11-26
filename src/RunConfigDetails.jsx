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
  const vm = results?.vm_environment ?? {};
  const rows = [
    [t("environment_cloud"), vm.cloud],
    [t("environment_gpu_vram"), vm.gpu && vm.vram ? t("environment_gpu_vram_value", vm.gpu, vm.vram) : null],
    [t("environment_cpu_vcpu"), vm.cpu && vm.vcpu ? t("environment_cpu_vcpu_value", vm.cpu, vm.vcpu) : null],
    [t("environment_ram"), vm.ram], [t("environment_os"), vm.os],
    [t("environment_driver"), vm.driver], [t("environment_cuda_toolkit"), vm.cuda_toolkit],
    [t("environment_docker"), vm.docker], [t("environment_image"), vm.image],
    [t("runtime_python"), valueFor("python")], [t("pytorch"), valueFor(null, "torch")],
    [t("runtime_transformers4rec"), valueFor(null, "transformers4rec")],
    [t("cost"), t("not_measured")],
  ];
  return <details className="panel environment-card">
    <summary><span className="summary-title">{t("environment")}</span> <span className="summary-sub">{t("environment_summary")}</span></summary>
    <dl className="env">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? t("MISSING")}</dd></div>)}</dl>
    <p className="environment-source">{t("environment_source_note", vm.source ?? t("MISSING"), vm.checksum_note ?? t("MISSING"))}</p>
  </details>;
}
