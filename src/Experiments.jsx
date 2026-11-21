import React, { useState } from "react";
import {
  EXPERIMENTS, MISSING, NOT_APPLICABLE, compareConfig, displayCell, exactValue, formatValue, modelLabel, splitByKind,
} from "./data.js";
import { DataKindBadge, Issues, Notice, StatusBadge } from "./ui.jsx";

// Metric definitions: label, default unit and scope (contract B5). Values always come from JSON.
const METRICS = {
  "Recall@20": { label: "Recall@20", unit: "ratio" },
  "NDCG@20": { label: "NDCG@20", unit: "ratio" },
  train_with_input_scan_seconds: { label: "Thời gian train (gồm input scan)", unit: "s" },
  inference_seconds: { label: "Thời gian đánh giá", unit: "s" },
  inference_ms_per_session: { label: "Evaluation time / session", unit: "ms/session" },
  inference_sessions_per_second: { label: "Evaluation throughput", unit: "sessions/s" },
  elapsed_seconds: { label: "Collector wall time", unit: "s" },
  peak_process_tree_rss_bytes: { label: "Peak process RSS", unit: "bytes" },
  peak_cuda_reserved_bytes: { label: "Peak CUDA reserved", unit: "bytes" },
  cost: { label: "Chi phí", unit: null },
  n_events: { label: "Weekly sampled events", unit: "events" },
  pipeline_read_seconds: { label: "Pipeline raw read", unit: "s" },
  preprocessing_seconds: { label: "Preprocessing", unit: "s" },
  first_seen_seconds: { label: "First-seen (dùng chung)", unit: "s" },
  bytes: { label: "Kích thước file", unit: "bytes" },
  read_seconds: { label: "Read wall time", unit: "s" },
  peak_read_process_rss_bytes: { label: "Peak reader RSS", unit: "bytes" },
  preprocessing_elapsed_seconds: { label: "Preprocessing wall time", unit: "s" },
  seconds_per_million_events: { label: "Thời gian / 1M events", unit: "s/million events" },
  bottleneck: { label: "Bottleneck (stage chậm nhất)", unit: "stage" },
  raw_read: { label: "Stage: raw read", unit: "s" },
  preprocessing_excluding_raw_read_and_first_seen: { label: "Stage: preprocessing", unit: "s" },
  train_including_sequence_io: { label: "Stage: train (gồm sequence I/O)", unit: "s" },
  final_evaluation_including_io: { label: "Stage: final evaluation (gồm I/O)", unit: "s" },
  composed_seconds_excluding_first_seen: { label: "Tổng composed (không first-seen)", unit: "s" },
  composed_seconds_with_first_seen: { label: "Tổng composed (có first-seen)", unit: "s" },
  process_wall_seconds: { label: "Process wall time quan sát", unit: "s" },
  limitations: { label: "Giới hạn / uncertainty", unit: "text" },
};

const MODEL_METRICS = [
  "Recall@20", "NDCG@20", "train_with_input_scan_seconds", "inference_seconds",
  "inference_ms_per_session", "inference_sessions_per_second", "elapsed_seconds",
  "peak_process_tree_rss_bytes", "peak_cuda_reserved_bytes",
];

const PANELS = {
  E1: {
    title: "E1 · So sánh model",
    question: "So sánh Popularity, GRU và XLNet trên cùng tập dữ liệu.",
    metrics: MODEL_METRICS,
  },
  E2: {
    title: "E2 · Ảnh hưởng của kích thước dữ liệu",
    question: "So sánh GRU trên các tỷ lệ lấy mẫu của tuần đầu tháng 10.",
    metrics: [...MODEL_METRICS, "n_events", "pipeline_read_seconds", "preprocessing_seconds", "first_seen_seconds"],
  },
  E3: {
    title: "E3 · Ảnh hưởng của tài nguyên",
    question: "So sánh hai cỡ lô huấn luyện GRU. Cỡ lô đánh giá được giữ cố định theo kế hoạch.",
    metrics: [...MODEL_METRICS, "cost"],
  },
  E4: {
    title: "E4 · CSV vs Parquet",
    question: "So sánh kích thước, thời gian đọc, tiền xử lý và bộ nhớ cho cùng dữ liệu.",
    metrics: ["bytes", "read_seconds", "peak_read_process_rss_bytes", "preprocessing_elapsed_seconds", "elapsed_seconds", "peak_process_tree_rss_bytes"],
  },
  E5: {
    title: "E5 · Khả năng mở rộng",
    question: "Tổng hợp log E2 để xem thời gian theo số sự kiện, điểm nghẽn và giới hạn.",
    metrics: [
      "seconds_per_million_events", "bottleneck", "raw_read",
      "preprocessing_excluding_raw_read_and_first_seen", "train_including_sequence_io",
      "final_evaluation_including_io", "composed_seconds_excluding_first_seen",
      "composed_seconds_with_first_seen", "process_wall_seconds", "limitations",
    ],
  },
};

const CONFIG_FIELDS = [
  ["train_batch_size", "Train batch", "sessions/batch"],
  ["eval_batch_size", "Eval batch", "sessions/batch"],
  ["epochs", "Epochs", "epochs"],
  ["sequence_length", "Sequence length", "items"],
  ["seed", "Seed", ""],
  ["learning_rate", "Learning rate", ""],
  ["subset", "Subset", ""],
  ["split", "Split", ""],
  ["train_partitions", "Train partitions", "day index"],
  ["eval_partition", "Eval partition", "day index"],
  ["input_format", "Input format", ""],
  ["device", "Device", ""],
  ["change_only", "Biến thay đổi", ""],
  ["artifact_versions", "Data versions", ""],
];

const ENV_FIELDS = [
  ["gpu", "GPU"], ["cuda", "CUDA"], ["driver", "Driver"], ["python", "Python"], ["torch", "torch"],
  ["cpu_model", "CPU"], ["cpu_cores", "CPU cores"], ["ram_bytes", "RAM (bytes)"], ["os", "OS"], ["platform", "Platform"],
];

const hidesMetrics = (run) => ["failed", "excluded"].includes(run.status);

function RunHeader({ run }) {
  return (
    <div className="run-head">
      <strong>{run.model ? modelLabel(run.model) : run.planned?.input_format ?? run.run_id}</strong>
      <code>{run.run_id}</code>
      <span className="badges"><StatusBadge status={run.status} /><DataKindBadge kind={run.data_kind} /></span>
      {(hidesMetrics(run) || run.exclusion_note) && <span className="note">Lý do: {run.exclusion_note || MISSING}</span>}
    </div>
  );
}

function MetricCell({ run, metricKey }) {
  if (hidesMetrics(run)) return <td className="missing">{NOT_APPLICABLE}</td>;
  const entry = run.metrics?.[metricKey];
  const value = entry?.value ?? null;
  const text = value === null ? displayCell(run, metricKey, value) : exactValue(value);
  const unit = entry?.unit;
  return (
    <td title={value === null ? undefined : exactValue(value)} className={value === null ? "missing" : "num"}>
      {text}
      {value !== null && unit && unit !== "text" && unit !== "stage" && <span className="unit"> {unit}</span>}
      {value !== null && entry?.scope && <span className="scope">{entry.scope}</span>}
    </td>
  );
}

function MetricTable({ runs, metrics, caption }) {
  if (!runs.length) return <p className="missing">{MISSING}</p>;
  return (
    <>
    {runs.length > 1 && <p className="scroll-hint">Vuốt ngang để xem đủ {runs.length} run →</p>}
    <div className="table-scroll">
      <table className="metric-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Chỉ số</th>
            {runs.map((run) => <th scope="col" key={run.run_id}><RunHeader run={run} /></th>)}
          </tr>
        </thead>
        <tbody>
          {metrics.map((key) => (
            <tr key={key}>
              <th scope="row">
                {METRICS[key].label}
                {METRICS[key].unit && <span className="unit"> ({METRICS[key].unit})</span>}
              </th>
              {runs.map((run) => <MetricCell key={run.run_id} run={run} metricKey={key} />)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}

function ConfigDetails({ run }) {
  const sources = Object.entries(run.sources ?? {});
  return (
    <details className="config">
      <summary>Cấu hình Dự kiến / Thực tế, môi trường, nguồn — <code>{run.run_id}</code></summary>
      <div className="table-scroll">
        <table className="config-table">
          <thead><tr><th scope="col">Tham số</th><th scope="col">Dự kiến</th><th scope="col">Thực tế</th><th scope="col">So sánh</th></tr></thead>
          <tbody>
            {CONFIG_FIELDS.map(([key, label, unit]) => {
              const planned = run.planned?.[key] ?? null;
              const actual = key === "change_only" ? undefined : run.actual?.[key] ?? null;
              const cmp = compareConfig(key, planned, actual);
              return (
                <tr key={key} className={cmp === "different" ? "diff" : ""}>
                  <th scope="row">{label}{unit && <span className="unit"> ({unit})</span>}</th>
                  <td className={planned === null ? "missing" : ""}>{displayCell(run, key, planned)}</td>
                  <td className={actual === null ? "missing" : ""}>{actual === undefined ? NOT_APPLICABLE : displayCell(run, key, actual)}</td>
                  <td>{cmp === "different" ? <span className="tag tag-diff">Khác</span> : cmp === "same" ? "Khớp" : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <h4>Môi trường</h4>
      <dl className="env">
        {ENV_FIELDS.map(([key, label]) => (
          <div key={key}><dt>{label}</dt><dd className={run.environment?.[key] == null ? "missing" : ""}>{formatValue(run.environment?.[key])}</dd></div>
        ))}
      </dl>
      <h4>Nguồn</h4>
      {sources.length ? <ul className="sources">
        {sources.map(([key, value]) => <li key={key}><span>{key}:</span> <code>{formatValue(value)}</code></li>)}
      </ul> : <p className="missing">{MISSING}</p>}
    </details>
  );
}

function RunSet({ runs, metrics, caption }) {
  return (
    <>
      <MetricTable runs={runs} metrics={metrics} caption={caption} />
      {runs.map((run) => <ConfigDetails key={run.run_id} run={run} />)}
    </>
  );
}

function E5Panel({ runs }) {
  const panel = PANELS.E5;
  return (
    <>
      {runs.length ? <RunSet runs={runs} metrics={panel.metrics} caption={panel.title} /> : (
        <div className="table-scroll">
          <table className="metric-table">
            <caption className="sr-only">{panel.title}</caption>
            <thead><tr><th scope="col">Chỉ số</th><th scope="col">Tổng hợp E5</th></tr></thead>
            <tbody>
              {panel.metrics.map((key) => (
                <tr key={key}>
                  <th scope="row">{METRICS[key].label}{METRICS[key].unit && <span className="unit"> ({METRICS[key].unit})</span>}</th>
                  <td className="missing">{MISSING}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!runs.length && <p className="definition">Run nguồn (E2), cấu hình và môi trường: {MISSING}</p>}
    </>
  );
}

export default function Experiments({ state }) {
  const { runs = [], meta = {}, issues = [], fatal, error } = state;
  const [active, setActive] = useState("E1");
  const [showToy, setShowToy] = useState(true);

  if (error) return <Notice kind="error" title="Không tải được kết quả E1–E5">{error}</Notice>;
  if (fatal) return (<><Notice kind="error" title="run-results.json không hợp lệ">{fatal}</Notice><Issues issues={issues} /></>);

  const panel = PANELS[active];
  const { official, toy } = splitByKind(runs, active);
  const order = (r) => official.findIndex((o) => o.run_id === r.matrix_run_id);
  const toySorted = [...toy].sort((a, b) => order(a) - order(b));

  return (
    <>
      <Issues issues={issues} />
      {!meta.confirmed_by_tv2 && (
        <Notice kind="warn" title="Chưa có package E1–E5 chính thức từ TV2">
          Cột Dự kiến lấy từ experiment matrix. Cột Thực tế và các chỉ số sẽ hiện "{MISSING}" cho đến khi TV2 bàn giao.
          {meta.team_commit && <> Dữ liệu tạo từ commit nhóm <code>{meta.team_commit}</code>.</>}
        </Notice>
      )}

      <nav className="subtabs" aria-label="Thí nghiệm">
        {EXPERIMENTS.map((id) => (
          <button key={id} type="button" className={id === active ? "active" : ""} aria-pressed={id === active} onClick={() => setActive(id)}>{id}</button>
        ))}
        <label className="toggle">
          <input type="checkbox" checked={showToy} onChange={(e) => setShowToy(e.target.checked)} />
          Hiện run toy (tham khảo định dạng)
        </label>
      </nav>

      <section className="panel">
        <div className="panel-heading">
          <h2>{panel.title}</h2>
        </div>
        <p className="definition">{panel.question}</p>

        {active === "E5" ? <E5Panel runs={official} /> : (
          <>
            <h3>{meta.confirmed_by_tv2 ? "Run chính thức" : "Run theo kế hoạch"}</h3>
            {official.length ? <RunSet runs={official} metrics={panel.metrics} caption={`${panel.title} — chính thức`} /> : <p className="missing">{MISSING}</p>}
          </>
        )}

        {showToy && toySorted.length > 0 && (
          <div className="toy-block">
            <h3>Run toy smoke <DataKindBadge kind="toy" /></h3>
            <p className="definition">
              Các lượt chạy trên dữ liệu tổng hợp dùng để kiểm tra công cụ.
            </p>
            <RunSet runs={toySorted} metrics={panel.metrics} caption={`${panel.title} — toy`} />
          </div>
        )}
      </section>
    </>
  );
}
