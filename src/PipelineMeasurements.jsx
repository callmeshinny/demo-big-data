import React from "react";
import { formatValue } from "./data.js";
import { PipelineMeasurementBadge, visiblePipelineMeasurements } from "./pipeline-measurements.js";

const E2_FIELDS = [
  ["Tập con", "subset", "%"],
  ["Đọc", "read_seconds", "s"],
  ["Tiền xử lý", "preprocessing_seconds", "s"],
  ["Workflow", "workflow_seconds", "s"],
  ["Chia tập", "split_seconds", "s"],
  ["Định dạng", "input_format"],
  ["Dung lượng", "input_bytes", "bytes"],
];
const E4_FIELDS = [
  ["Định dạng", "format"],
  ["Dung lượng", "bytes", "bytes"],
  ["Đọc", "read_seconds", "s"],
  ["Tiền xử lý", "preprocessing_seconds", "s"],
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
    <h2>Số đo preprocessing (TV1) — chưa xác nhận</h2>
    <PipelineMeasurementBadge measurements={visible} />
    <h3>E2 · Tiền xử lý theo tập con</h3>
    <MeasurementTable rows={visible.e2} fields={E2_FIELDS} />
    <h3>E4 · CSV và Parquet</h3>
    {e4.length ? e4.map((record, index) => <div key={index}>
      <p>{formatValue(record.smoke_scope)}</p>
      <MeasurementTable rows={record.formats} fields={E4_FIELDS} />
    </div>) : <p>{formatValue(null)}</p>}
  </section>;
}
