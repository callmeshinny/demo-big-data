// Server-renders every tab and E1–E5 panel in EN and VI through Vite's SSR loader.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "vite";
import React from "react";
import * as dom from "react-dom/server";
import { fileURLToPath } from "node:url";

const json = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const demo = json("../public/demo-data.json");
const overview = json("../public/dataset-overview.json");
const official = json("../public/official-results.json");

let server;
let load;
before(async () => {
  globalThis.window ??= { location: { search: "", hash: "" } };
  server = await createServer({ root: fileURLToPath(new URL("..", import.meta.url)), logLevel: "error", server: { middlewareMode: true, hmr: false }, appType: "custom" });
  load = (path) => server.ssrLoadModule(path);
});
after(() => server?.close());

async function modules() {
  const [i18n, data, dataset, rec, ds, exp] = await Promise.all([
    load("/src/i18n.js"), load("/src/data.js"), load("/src/dataset.js"),
    load("/src/Recommendation.jsx"), load("/src/Dataset.jsx"), load("/src/Experiments.jsx"),
  ]);
  return { React, dom, i18n, data, dataset, Recommendation: rec.default, e1StripRows: rec.e1StripRows, Dataset: ds.default, Experiments: exp.default };
}

const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");


function renderAll(m, locale) {
  m.i18n.setLanguage(locale);
  const h = m.React.createElement;
  const render = (el) => m.dom.renderToStaticMarkup(el);
  const pages = {
    recommendation: render(h(m.Recommendation, { state: m.data.normalizeDemo(demo), productInfo: {}, protocol: overview.evaluation_protocol, official })),
    dataset: render(h(m.Dataset, { state: m.dataset.normalizeDataset(overview) })),
  };
  for (const id of ["E1", "E2", "E3", "E4", "E5"]) pages[id] = render(h(m.Experiments, { state: { results: official }, active: id }));
  return pages;
}

test("no i18n key name appears verbatim on any tab or panel (EN and VI)", async () => {
  const m = await modules();
  // A key whose translation is the key itself labels a package field on purpose (e.g. source_metrics).
  const keys = Object.keys(m.i18n.messages.en).filter((key) => /_|^[A-Z]+$/.test(key)
    && m.i18n.messages.en[key] !== key && m.i18n.messages.vi[key] !== key);
  for (const locale of ["en", "vi"]) {
    for (const [name, html] of Object.entries(renderAll(m, locale))) {
      const tokens = new Set(text(html).split(/[\s:·,;()→]+/u));
      const leaked = keys.filter((key) => tokens.has(key));
      assert.deepEqual(leaked, [], `${locale}/${name}`);
    }
  }
  // A lookup of an undefined key renders the key name itself (e.g. note_E5_derived_from_E2).
  assert.deepEqual([...m.i18n.missingKeys], [], "t() called with undefined keys");
});

test("E5 derived-from-E2 note is translated, cites metrics.json, and follows the flag", async () => {
  const m = await modules();
  const h = m.React.createElement;
  for (const locale of ["en", "vi"]) {
    m.i18n.setLanguage(locale);
    const shown = text(m.dom.renderToStaticMarkup(h(m.Experiments, { state: { results: official }, active: "E5" })));
    assert.ok(shown.includes(m.i18n.t("note_E5_derived_from_E2")), locale);
    assert.ok(shown.includes("metrics.json → E5_aggregation_only"), locale);
    assert.ok(!shown.includes("data_dictionary.json → E5_derived_from_E2"), locale);
    const hidden = text(m.dom.renderToStaticMarkup(h(m.Experiments, { state: { results: { ...official, E5_aggregation_only: false } }, active: "E5" })));
    assert.ok(!hidden.includes(m.i18n.t("note_E5_derived_from_E2")), locale);
  }
});

test("shipped predictions: no Score column, one ranked-IDs note", async () => {
  const m = await modules();
  for (const locale of ["en", "vi"]) {
    const html = renderAll(m, locale).recommendation;
    assert.ok(!html.includes("score-col") && !html.includes('class="missing score"'), locale);
    assert.equal(html.split(m.i18n.t("models_export_ranked_ids_only")).length - 1, 1, locale);
  }
});

test("exported scores are shown with the shared formatter; null scores show the missing text", async () => {
  const m = await modules();
  m.i18n.setLanguage("en");
  const h = m.React.createElement;
  const html = m.dom.renderToStaticMarkup(h(m.Recommendation, { state: m.data.normalizeDemo(json("./fixtures/scored.json")), productInfo: {}, official }));
  assert.ok(html.includes("score-col"));
  assert.match(html, /<td class="score num"[^>]*>0\.8125<\/td>/);
  assert.match(html, /<td class="score num"[^>]*>0\.03125<\/td>/);
  assert.match(html, /<td class="missing score">Not available yet<\/td>/);
  assert.ok(!html.includes(m.i18n.t("models_export_ranked_ids_only")));
});

test("E1 strip matches the E1 table and never prints NaN", async () => {
  const m = await modules();
  m.i18n.setLanguage("en");
  const rows = m.e1StripRows(official);
  assert.deepEqual(rows.map((row) => [row.label, row.recall.text]), [["Popularity", "0.0868"], ["GRU", "0.0883"], ["XLNet", "0.1249"]]);
  const broken = structuredClone(official);
  delete broken.tables.E1.find((row) => row.model === "gru")["Recall@20"];
  const gru = m.e1StripRows(broken).find((row) => row.label === "GRU");
  assert.equal(gru.recall.text, m.i18n.t("not_available_yet"));
  const html = m.dom.renderToStaticMarkup(m.React.createElement(m.Recommendation, { state: m.data.normalizeDemo(demo), productInfo: {}, official: broken }));
  assert.ok(!html.includes("NaN"));
  assert.ok(html.includes(`Recall@20: ${m.i18n.t("not_available_yet")}`));
});
