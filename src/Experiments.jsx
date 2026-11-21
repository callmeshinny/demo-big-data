import React, { useState } from "react";
import {
  EXPERIMENTS, MISSING, compareConfig, displayCell, exactValue, formatValue, modelLabel, splitByKind,
} from "./data.js";
import { DataKindBadge, Issues, Notice, StatusBadge } from "./ui.jsx";

// Metric definitions: label, default unit and scope (contract B5). Values always come from JSON.
const METRICS = {
  "Recall@20": { label: "Recall@20", unit: "ratio" },
  "NDCG@20": { label: "NDCG@20", unit: "ratio" },
  train_with_input_scan_seconds: { label: "Thời gian train (gồm input scan)", unit: "s" },
  inference_seconds: { label: "Evaluation wall time", unit: "s", scope: "full_evaluation_wall_v1, gồm I/O, không phải latency thuần" },
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
    question: "Model nào tốt hơn? Popularity / GRU / XLNet trên subset 10%.",
    metrics: MODEL_METRICS,
  },
  E2: {
    title: "E2 · Ảnh hưởng của kích thước dữ liệu",
    question: "GRU trên 10 / 25 / 50 / 100% session (100% = tuần đầu tháng 10).",
    metrics: [...MODEL_METRICS, "n_events", "pipeline_read_seconds", "preprocessing_seconds", "first_seen_seconds"],
  },
  E3: {
    title: "E3 · Ảnh hưởng của tài nguyên",
    question: "GRU 10%, train batch 32 vs 128, eval batch 32. Chỉ đổi train batch.",
    metrics: [...MODEL_METRICS, "cost"],
  },
  E4: {
    title: "E4 · CSV vs Parquet",
    question: "Cùng nội dung, subset raw 10%: kích thước, thời gian đọc, preprocessing, bộ nhớ.",
    metrics: ["bytes", "read_seconds", "peak_read_process_rss_bytes", "preprocessing_elapsed_seconds", "elapsed_seconds", "peak_process_tree_rss_bytes"],
  },
  E5: {
    title: "E5 · Khả năng mở rộng",
    question: "Suy ra từ log E2, không train thêm: thời gian / 1M events, bottleneck, giới hạn.",
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

function RunHeader({ run }) {
  return (
    <div className="run-head">
      <strong>{run.model ? modelLabel(run.model) : run.planned?.input_format ?? run.run_id}</strong>
      <code>{run.run_id}</code>
      <span className="badges"><StatusBadge status={run.status} /><DataKindBadge kind={run.data_kind} /></span>
      {run.exclusion_note && <span className="note">{run.exclusion_note}</span>}
    </div>
  );
}

function MetricCell({ run, metricKey }) {
  const entry = run.metrics?.[metricKey];
  const value = entry?.value ?? null;
  const text = displayCell(run, metricKey, value);
  const def = METRICS[metricKey];
  const unit = entry?.unit ?? def.unit;
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
                {METRICS[key].scope && <span className="scope">{METRICS[key].scope}</span>}
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
                  <td className={actual === null ? "missing" : ""}>{actual === undefined ? "—" : displayCell(run, key, actual)}</td>
                  <td>{cmp === "different" ? <span className="tag tag-diff">Khác</span> : cmp === "same" ? "Khớp" : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <h4>Môi trường</h4>
      <dl className="env">
        {ENV_FIELDS.filter(([key]) => key !== "platform" || run.environment?.platform).map(([key, label]) => (
          <div key={key}><dt>{label}</dt><dd className={run.environment?.[key] == null ? "missing" : ""}>{formatValue(run.environment?.[key])}</dd></div>
        ))}
      </dl>
      <h4>Nguồn</h4>
      <ul className="sources">
        {sources.map(([key, value]) => <li key={key}><span>{key}:</span> <code>{value ?? MISSING}</code></li>)}
      </ul>
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

function E5Panel({ allRuns }) {
  const e2 = allRuns.filter((r) => r.experiment === "E2" && r.data_kind !== "toy");
  const e5 = allRuns.filter((r) => r.experiment === "E5");
  const panel = PANELS.E5;
  return (
    <>
      {e5.length ? <RunSet runs={e5} metrics={panel.metrics} caption={panel.title} /> : (
        <div className="table-scroll">
          <table className="metric-table">
            <caption className="sr-only">{panel.title}</caption>
            <thead><tr><th scope="col">Chỉ số</th><th scope="col">E5 summary</th></tr></thead>
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
      <p className="definition">
        Run nguồn (E2): {e2.length ? e2.map((r) => <code key={r.run_id}>{r.run_id}</code>).reduce((a, b) => [a, ", ", b]) : MISSING}.
        {" "}Cấu hình và môi trường của E5 lấy từ các run E2 này.
      </p>
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
          <div><p className="eyebrow">{active}</p><h2>{panel.title}</h2></div>
        </div>
        <p className="definition">{panel.question}</p>

        {active === "E5" ? <E5Panel allRuns={runs} /> : (
          <>
            <h3>Run chính thức</h3>
            {official.length ? <RunSet runs={official} metrics={panel.metrics} caption={`${panel.title} — chính thức`} /> : <p className="missing">{MISSING}</p>}
          </>
        )}

        {showToy && toySorted.length > 0 && (
          <div className="toy-block">
            <h3>Run toy smoke <DataKindBadge kind="toy" /></h3>
            <p className="definition">
              Chạy trên dữ liệu tổng hợp ({toySorted[0]?.metrics?.["Recall@20"]?.scope ?? "vài session"}) để kiểm tra công cụ.
              Không dùng để so sánh model hay kết luận.
            </p>
            <RunSet runs={toySorted} metrics={panel.metrics} caption={`${panel.title} — toy`} />
          </div>
        )}
      </section>
    </>
  );
}
