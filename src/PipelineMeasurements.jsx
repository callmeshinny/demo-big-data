import { t } from "./i18n.js";
import React from "react";
import { formatValue } from "./data.js";
import { PipelineMeasurementBadge, visiblePipelineMeasurements } from "./pipeline-measurements.js";

const E2_FIELDS = () => [
  [t("subset"), "subset", "%"],
  [t("read"), "read_seconds", "s"],
  [t("preprocessing"), "preprocessing_seconds", "s"],
  ["Workflow", "workflow_seconds", "s"],
  [t("split_sessions"), "split_seconds", "s"],
  [t("format"), "input_format"],
  [t("size"), "input_bytes", "bytes"],
];
const E4_FIELDS = () => [
  [t("format"), "format"],
  [t("size"), "bytes", "bytes"],
  [t("read"), "read_seconds", "s"],
  [t("preprocessing"), "preprocessing_seconds", "s"],
];

function MeasurementTable({ rows, fields }) {
  if (!Array.isArray(rows) || !rows.length) return <p>{formatValue(null)}</p>;
  return <div className="table-scroll"><table className="config-table">
    <thead><tr>{fields.map(([label, key, unit]) => <th scope="col" key={key}>{label}{unit && ` (${unit})`}</th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={index}>{fields.map(([, key]) => <td key={key}>{formatValue(row[key])}</td>)}</tr>)}</tbody>
  </table></div>;
}

export default function PipelineMeasurements({ measurements }) {
  const visible = visiblePipelineMeasurements(measurements);
  if (!visible) return null;
  const e4 = Array.isArray(visible.e4_smoke) ? visible.e4_smoke : [];
  return <section className="panel">
    <h2>{t("preliminary_preprocessing_measurements_tv1")}</h2>
    <PipelineMeasurementBadge measurements={visible} />
    <h3>{t("e2_preprocessing_by_subset")}</h3>
    <MeasurementTable rows={visible.e2} fields={E2_FIELDS()} />
    <h3>{t("e4_csv_and_parquet")}</h3>
    {e4.length ? e4.map((record, index) => <div key={index}>
      <p>{formatValue(record.smoke_scope)}</p>
      <MeasurementTable rows={record.formats} fields={E4_FIELDS()} />
    </div>) : <p>{formatValue(null)}</p>}
  </section>;
}
