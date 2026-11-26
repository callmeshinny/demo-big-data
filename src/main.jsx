import { readLanguage, setLanguage, t } from "./i18n.js";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { loadDeclaredProductInfo, loadJson, normalizeDemo, normalizeProductInfo } from "./data.js";
import Recommendation from "./Recommendation.jsx";
import { routeFromHash } from "./navigation.js";
import Dataset from "./Dataset.jsx";
import { normalizeDataset } from "./dataset.js";
import Experiments from "./Experiments.jsx";
import { LanguageSwitch, MainNav } from "./Nav.jsx";
import "./styles.css";

const branding = import.meta.glob(["./branding/logo.png", "./branding/cover.jpg"], {
  eager: true, query: "?url", import: "default",
});
const logo = branding["./branding/logo.png"];
const cover = branding["./branding/cover.jpg"];

// Optional overrides for testing broken files, e.g. ?demo=/tests/fixtures/empty.json
// Only same-origin absolute paths are accepted.
function source(param, fallback) {
  if (!import.meta.env.DEV) return fallback;
  const value = new URLSearchParams(window.location.search).get(param);
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
const base = import.meta.env.BASE_URL;
const DEMO_URL = source("demo", `${base}demo-data.json`);
const DATASET_URL = source("dataset", `${base}dataset-overview.json`);
const OFFICIAL_RESULTS_URL = `${base}official-results.json`;

function normalizeOfficialResults(data) {
  return { results: data };
}

function useData(url, normalize, language) {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    let alive = true;
    loadJson(url).then(({ data, error }) => {
      if (!alive) return;
      setState(error ? { error } : { ...normalize(data), provenance: {
        team_commit: data?.team_commit,
        generated_at: data?.generated_at,
        data_kind: data?.data_kind,
        product_lookup: data?.provenance?.product_lookup,
      } });
    });
    return () => { alive = false; };
  }, [url, normalize, language]);
  return state;
}

function useOptionalProductInfo(url, language) {
  const [state, setState] = useState({});
  useEffect(() => {
    let alive = true;
    setState(url ? { loading: true } : {});
    loadDeclaredProductInfo(url).then(({ data, error, requested }) => {
      if (!alive) return;
      if (!requested) {
        setState({});
        return;
      }
      setState(error ? { error } : { ...normalizeProductInfo(data), provenance: {
        team_commit: data?.team_commit,
        generated_at: data?.generated_at,
        data_kind: data?.data_kind,
      } });
    });
    return () => { alive = false; };
  }, [url, language]);
  return state;
}

function currentRoute() {
  return routeFromHash(window.location.hash);
}

function App() {
  const [language, updateLanguage] = useState(readLanguage);
  setLanguage(language);
  const siteName = t("site_name");
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = siteName;
  }, [language, siteName]);
  function chooseLanguage(next) {
    try { localStorage.setItem("tv4-language", next); } catch { /* Storage is optional. */ }
    updateLanguage(next);
  }
  const [{ tab, experiment }, setRoute] = useState(currentRoute);
  const demo = useData(DEMO_URL, normalizeDemo, language);
  const productLookup = demo.provenance?.product_lookup;
  const productsUrl = typeof productLookup === "string" && productLookup.trim()
    ? source("products", `${base}${productLookup}`)
    : null;
  const products = useOptionalProductInfo(productsUrl, language);
  const dataset = useData(DATASET_URL, normalizeDataset, language);
  const officialResults = useData(OFFICIAL_RESULTS_URL, normalizeOfficialResults, language);

  useEffect(() => {
    const onHash = () => setRoute(currentRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const state = { recommendation: demo, data: dataset, experiments: officialResults }[tab];

  return (
    <>
      <header className="topbar glass">
        <div className="topbar-inner">
        <div className="brand">
          {logo && <img className="brand-logo" src={logo} alt="" />}
          <h1>{siteName}</h1>
        </div>
        <MainNav tab={tab} />
        <div className="header-utility">
          <LanguageSwitch language={language} onChoose={chooseLanguage} />
        </div>
        </div>
      </header>
      <main className="shell">
      {cover && <img className="brand-cover" src={cover} alt="" />}
      {tab !== "recommendation" && <p className="tab-intro">{t(`${tab}_tab_intro`)}</p>}
      <div className="view" id="view">
        {state.loading ? <p className="loading">{t("loading_data")}</p>
          : tab === "recommendation" ? <Recommendation state={state} productInfo={products} protocol={dataset.overview?.evaluation_protocol} official={officialResults.results} /> : tab === "data" ? <Dataset state={state} /> : <Experiments state={state} active={experiment} />}
      </div>

      <footer>
        <p>{t("values_pending_delivery_show_not_available")}</p>
        <ul>{[
          ["demo-data.json", demo], ["product-info.json", products],
          ["dataset-overview.json", dataset], ["official-results.json", officialResults],
        ].filter(([name, file]) => name !== "product-info.json" || file.provenance?.data_kind === "real").map(([name, file]) => <li key={name}>
          <code>{name}</code> {t("commit")} {file.provenance?.team_commit ?? t("not_available_yet")} {t("exported")} {file.provenance?.generated_at ?? t("not_available_yet")} · {file.provenance?.data_kind ?? t("not_available_yet")}
        </li>)}</ul>
      </footer>
      </main>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
