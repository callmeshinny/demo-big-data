import React from "react";
import { formatValue } from "./data.js";
import { t } from "./i18n.js";

function Evidence({ source }) {
  return source ? <p className="definition">{t("source")} <code>{source}</code></p> : null;
}

export function SubsetSelection({ sampling, subsets, source, distributionSource }) {
  if (!sampling) return null;
  return <section className="panel">
    <h2>{t("why_subset")}</h2>
    <p>{t("whole_session_sampling", formatValue(sampling.seed))}</p>
    <p>{t("sampling_scope", formatValue(sampling.population_sessions))}</p>
    <p>{t("subset_diversity")}</p>
    <div className="table-scroll"><table className="config-table">
      <thead><tr>{[t("target_percent"), t("actual_raw_session_pct"), t("raw_sessions")].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead>
      <tbody>{subsets.map((row) => <tr key={row.subset_session_threshold_pct}>
        <th scope="row">{formatValue(row.subset_session_threshold_pct)}%</th>
        <td title={String(row.actual_raw_session_pct)}>{formatValue(row.actual_raw_session_pct)}</td>
        <td title={String(row.raw_sessions)}>{formatValue(row.raw_sessions)}</td>
      </tr>)}</tbody>
    </table></div>
    <Evidence source={sampling.source} />
    <Evidence source={source} />
    <Evidence source={distributionSource} />
  </section>;
}

export function FiveVs({ overview }) {
  const { raw_month: raw, sampling, cleanup_reference: cleanup, raw_schema: schema, evaluation_protocol: protocol } = overview;
  const cards = [
    ["volume", t("volume_facts", formatValue(raw.row_count), formatValue(sampling?.input_bytes)), [raw.source, sampling?.source]],
    ["velocity", t("velocity_facts"), [raw.source, protocol?.source]],
    ["variety", t("variety_facts", formatValue(schema?.columns), formatValue(raw.distinct?.event_type), formatValue(raw.distinct?.category_code), formatValue(raw.distinct?.brand)), [schema?.source, raw.source]],
    ["veracity", t("veracity_facts", formatValue(raw.missing?.brand), formatValue(raw.missing?.category_code), formatValue(raw.invalid_timestamps), formatValue(cleanup?.consecutive_repeat_rows_removed)), [raw.source, cleanup?.source]],
    ["value", t("value_facts", formatValue(protocol?.top_k)), [protocol?.source]],
  ];
  return <section className="panel">
    <h2>{t("five_vs")}</h2>
    <div className="dataset-cards">{cards.map(([key, text, sources]) => <article key={key}>
      <h3>{t(key)}</h3><p>{text}</p>
      {sources.filter(Boolean).map((source) => <Evidence key={source} source={source} />)}
    </article>)}</div>
  </section>;
}
