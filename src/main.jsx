import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { loadJson, normalizeDemo, normalizeProductInfo, normalizeResults, MISSING } from "./data.js";
import Recommendation from "./Recommendation.jsx";
import { routeFromHash } from "./navigation.js";
import Dataset from "./Dataset.jsx";
import { normalizeDataset } from "./dataset.js";
import Experiments from "./Experiments.jsx";
import "./styles.css";

const TABS = [
  { id: "recommendation", label: "Gợi ý sản phẩm" },
  { id: "data", label: "Dữ liệu" },
  { id: "experiments", label: "Thí nghiệm E1–E5" },
];

// Optional overrides for testing broken files, e.g. ?demo=/tests/fixtures/empty.json
// Only same-origin absolute paths are accepted.
function source(param, fallback) {
  if (!import.meta.env.DEV) return fallback;
  const value = new URLSearchParams(window.location.search).get(param);
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
const base = import.meta.env.BASE_URL;
const DEMO_URL = source("demo", `${base}demo-data.json`);
const PRODUCTS_URL = source("products", `${base}product-info.json`);
const DATASET_URL = source("dataset", `${base}dataset-overview.json`);
const RESULTS_URL = source("results", `${base}run-results.json`);

function useData(url, normalize) {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    let alive = true;
    loadJson(url).then(({ data, error }) => {
      if (!alive) return;
      setState(error ? { error } : { ...normalize(data), provenance: {
        team_commit: data?.team_commit, generated_at: data?.generated_at, data_kind: data?.data_kind,
      } });
    });
    return () => { alive = false; };
  }, [url, normalize]);
  return state;
}

function currentRoute() {
  return routeFromHash(window.location.hash);
}

function App() {
  const [{ tab, experiment, presenting }, setRoute] = useState(currentRoute);
  const demo = useData(DEMO_URL, normalizeDemo);
  const products = useData(PRODUCTS_URL, normalizeProductInfo);
  const dataset = useData(DATASET_URL, normalizeDataset);
  const results = useData(RESULTS_URL, normalizeResults);

  useEffect(() => {
    const onHash = () => setRoute(currentRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const state = { recommendation: demo, data: dataset, experiments: results }[tab];

  return (
    <main className={presenting ? "shell presenting" : "shell"}>
      <header className="topbar">
        <div>
          <p className="eyebrow">Big Data · Bản demo TV4</p>
          <h1>Gợi ý sản phẩm tiếp theo</h1>
          <p className="lede">Một phiên là một lượt truy cập, mỗi lần bấm vào sản phẩm là một sự kiện. Model nhận các sản phẩm trước mục cuối và trả về một danh sách Top-20 cho cả phiên. Mục cuối là sản phẩm khách thực sự xem tiếp.</p>
          <p className="definition">Recall@20 đo tỷ lệ phiên có sản phẩm thực tế trong Top-20. NDCG@20 cho trọng số cao hơn khi sản phẩm đó đứng gần đầu danh sách.</p>
          <p className="definition">Popularity là model cơ sở. Cả Popularity, GRU và XLNet chỉ dùng mã sản phẩm. Tên hiển thị được ghép từ thương hiệu và danh mục để dễ đọc. Giá dùng để hiển thị.</p>
          <p className="definition">Demo phát lại kết quả dự đoán đã chạy sẵn trên dữ liệu kiểm tra, không chạy model trực tiếp. Xem kết quả đánh giá trong tab Thí nghiệm E1–E5.</p>
        </div>
      </header>

      <nav className="tabs" role="tablist" aria-label="Màn hình">
        {TABS.map((t) => (
          <a key={t.id} href={`#${t.id}`} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "active" : ""}>{t.label}</a>
        ))}
      </nav>

      <div className="presentation-toggle">
        <a href={presenting ? "#recommendation" : "#present"}>{presenting ? "Thoát chế độ trình bày" : "Chế độ trình bày"}</a>
      </div>
      <div role="tabpanel">
        {state.loading ? <p className="loading">Đang tải dữ liệu…</p>
          : tab === "recommendation" ? <Recommendation state={state} productInfo={products} presenting={presenting} /> : tab === "data" ? <Dataset state={state} /> : <Experiments state={state} active={experiment} />}
      </div>

      <footer>
        <p>Giá trị chưa bàn giao hiển thị “Chưa có”.</p>
        <ul>{[
          ["demo-data.json", demo], ["product-info.json", products],
          ["dataset-overview.json", dataset], ["run-results.json", results],
        ].map(([name, file]) => <li key={name}>
          <code>{name}</code> · Commit {file.provenance?.team_commit ?? MISSING} · Ngày xuất {file.provenance?.generated_at ?? MISSING} · {file.provenance?.data_kind ?? MISSING}
        </li>)}</ul>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
