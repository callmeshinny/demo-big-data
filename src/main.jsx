import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { loadJson, normalizeDemo, normalizeProductInfo, normalizeResults } from "./data.js";
import Recommendation from "./Recommendation.jsx";
import Experiments from "./Experiments.jsx";
import "./styles.css";

const TABS = [
  { id: "recommendation", label: "Recommendation" },
  { id: "experiments", label: "Experiments E1–E5" },
];

// Optional overrides for testing broken files, e.g. ?demo=/tests/fixtures/empty.json
// Only same-origin absolute paths are accepted.
function source(param, fallback) {
  const value = new URLSearchParams(window.location.search).get(param);
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
const base = import.meta.env.BASE_URL;
const DEMO_URL = source("demo", `${base}demo-data.json`);
const PRODUCTS_URL = source("products", `${base}product-info.json`);
const RESULTS_URL = source("results", `${base}run-results.json`);

function useData(url, normalize) {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    let alive = true;
    loadJson(url).then(({ data, error }) => {
      if (!alive) return;
      setState(error ? { error } : normalize(data));
    });
    return () => { alive = false; };
  }, [url, normalize]);
  return state;
}

function currentTab() {
  const hash = window.location.hash.replace("#", "");
  return TABS.some((t) => t.id === hash) ? hash : TABS[0].id;
}

function App() {
  const [tab, setTab] = useState(currentTab);
  const demo = useData(DEMO_URL, normalizeDemo);
  const products = useData(PRODUCTS_URL, normalizeProductInfo);
  const results = useData(RESULTS_URL, normalizeResults);

  useEffect(() => {
    const onHash = () => setTab(currentTab());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const state = tab === "recommendation" ? demo : results;

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Big Data · Session-based recommendation · TV4 demo</p>
          <h1>Next-item recommendation</h1>
          <p className="lede">Input: lịch sử một session. Output: Top-20 sản phẩm có khả năng xem tiếp. Đánh giá bằng Recall@20 và NDCG@20.</p>
        </div>
      </header>

      <nav className="tabs" role="tablist" aria-label="Màn hình">
        {TABS.map((t) => (
          <a key={t.id} href={`#${t.id}`} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "active" : ""}>{t.label}</a>
        ))}
      </nav>

      <div role="tabpanel">
        {state.loading ? <p className="loading">Đang tải dữ liệu…</p>
          : tab === "recommendation" ? <Recommendation state={state} productInfo={products} /> : <Experiments state={state} />}
      </div>

      <footer>
        Web chỉ hiển thị artifact nhóm đã bàn giao. Không train, không tính lại metric. Giá trị chưa bàn giao hiện "Chưa có".
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
