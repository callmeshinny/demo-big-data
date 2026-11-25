import { t } from "./i18n.js";
import React, { useState } from "react";
import { formatValue } from "./data.js";
import { histogramBuckets } from "./dataset.js";
import { FiveVs, SubsetSelection } from "./DatasetContext.jsx";
import EvaluationProtocol from "./EvaluationProtocol.jsx";
import { Notice } from "./ui.jsx";

const SUBSET_FIELDS = () => [
  [t("raw_sessions"), "raw_sessions"], [t("actual_raw_session_pct"), "actual_raw_session_pct"],
  [t("raw_events"), "raw_events"], [t("actual_raw_event_pct"), "actual_raw_event_pct"],
  [t("cleaned_events"), "cleaned_events"], [t("cleaned_users"), "cleaned_users"],
  [t("model_sequences"), "model_sequences"], [t("catalog_items"), "catalog_items"],
  ["categories (category_id)", "cleaned_categories"], [t("cleaned_brands"), "cleaned_brands"],
  [t("catalog_coverage_of_100_pct"), "catalog_coverage_of_100_pct"],
];

const PIPELINE = () => [
  [t("raw_csv"), t("read_the_store_events"), "TV1"],
  [t("clean_data"), t("normalize_timestamps_drop_null_sessions_and"), "TV1"],
  [t("monthly_first_seen"), t("record_when_each_product_first_appeared"), "TV1"],
  ["Fit workflow", t("build_the_mapping_and_catalog"), "TV1"],
  [t("build_sequences"), t("keep_up_to_20_products_per"), "TV1"],
  [t("split_sessions"), t("split_training_validation_and_test_by"), "TV1"],
  ["Model", t("train_and_evaluate_the_models"), "TV2 / TV3"],
  ["Top-20", t("export_a_ranked_list_for_each"), "TV2"],
];

export default function Dataset({ state }) {
  const [selected, setSelected] = useState("");
  if (state.error || state.fatal) return <Notice kind="error" title={t("could_not_load_the_dataset_overview")}>{state.error ?? state.fatal}</Notice>;
  const { overview } = state;
  const raw = overview.raw_month;
  const subset = overview.subsets.find((row) => String(row.subset) === selected) ?? overview.subsets[0];
  const subsetFields = SUBSET_FIELDS();
  const buckets = histogramBuckets(subset?.session_length_histogram);
  const max = Math.max(0, ...buckets.map((bucket) => bucket.count ?? 0));
  return (
    <>
      <section className="panel">
        <h2>{t("e_commerce_dataset")}</h2>
        <p>{t("the_kaggle_ecommerce_dataset_records_activity")} {raw.min_timestamp_utc?.slice(0, 7) ?? t("not_available_yet")}{t("each_event_is_a_view_add")}</p>
        <h3>{t("raw_month")}</h3>
        <dl className="env">
          {[
            [t("rows"), raw.row_count], [t("start_utc"), raw.min_timestamp_utc], [t("end_utc"), raw.max_timestamp_utc],
            [t("missing_brand"), raw.missing?.brand], [t("missing_category"), raw.missing?.category_code],
          ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{formatValue(value)}</dd></div>)}
        </dl>
        <p className="definition">{t("source")} <code>{formatValue(raw.source)}</code></p>
      </section>
      <SubsetSelection sampling={overview.sampling} subsets={overview.subsets} source={overview.supplementary_sources?.sampling_population} distributionSource={overview.supplementary_sources?.subset_distribution} />
      <FiveVs overview={overview} />
      <section className="panel">
        <h2>{t("weekly_cudf_subsets")}</h2>
        <div className="table-scroll">
          <table className="config-table">
            <thead><tr><th scope="col">{t("metric")}</th>{overview.subsets.map((row) => <th scope="col" key={row.subset}>{row.subset}%</th>)}</tr></thead>
            <tbody>{subsetFields.map(([label, field]) => <tr key={field}><th scope="row">{label}</th>{overview.subsets.map((row) => <td key={row.subset} title={row[field] == null ? undefined : String(row[field])}>{formatValue(row[field])}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <p className="definition">{t("source")} <code>{formatValue(overview.supplementary_sources?.sampling_population)}</code></p>
      </section>
      <section className="panel">
        <h2>{t("data_caveats")}</h2>
        <p>{t("single_interaction_caveat", formatValue(subset?.single_interaction_session_pct))}</p>
        <p>{t("browsing_heavy_caveat", formatValue(subset?.view_pct_clean_events))}</p>
        <p className="definition">{t("source")} <code>{formatValue(overview.supplementary_sources?.preprocessing_retention)}</code> · <code>{formatValue(overview.supplementary_sources?.subset_distribution)}</code></p>
      </section>
      <section className="panel">
        <h2>{t("split_population")}</h2>
        <div className="table-scroll"><table className="config-table">
          <thead><tr><th scope="col">{t("subset")}</th>{[["final_test_D", t("final_test_partition")], ["train_used_1_to_Dminus1", t("train_used_partitions")], ["validation_used_2_to_D", t("validation_used_partitions")]].map(([field, label]) => <th scope="col" key={field}>{label}</th>)}</tr></thead>
          <tbody>{overview.subsets.map((row) => <tr key={row.subset}><th scope="row">{row.subset}%</th>{["final_test_D", "train_used_1_to_Dminus1", "validation_used_2_to_D"].map((field) => <td key={field} title={row[field] == null ? undefined : String(row[field])}>{formatValue(row[field])}</td>)}</tr>)}</tbody>
        </table></div>
        <p className="definition">{t("source")} <code>{formatValue(overview.supplementary_sources?.split_population)}</code></p>
      </section>
      <section className="panel">
        <h2>{t("session_length")}</h2>
        {subset && <label>{t("subset")} <select aria-label={t("subset")} value={subset.subset} onChange={(event) => setSelected(event.target.value)}>
          {overview.subsets.map((row) => <option key={row.subset} value={row.subset}>{row.subset}%</option>)}
        </select></label>}
        <p className="definition">{t("single_event_sessions_are_dropped_because")}</p>
        {buckets.length ? <>
          <p className="definition">{buckets.at(-1).label} {t("is_the_sum_of_the_longer")}</p>
          <ul className="bars">{buckets.map((bucket, index) => <li key={bucket.label}>
            <span>{bucket.label}</span>
            {bucket.count !== null && <meter className={index === 0 ? "highlight-bar" : ""} min={0} max={max || 1} value={bucket.count} aria-label={t("sessions_of_length_0", bucket.label)} />}
            <span>{formatValue(bucket.count)}</span>
          </li>)}</ul>
        </> : <p>{t("not_available_yet")}</p>}
      </section>
      <section className="panel">
        <h2>{t("processing_pipeline")}</h2>
        <ol className="pipeline">{PIPELINE().map(([label, description, owner]) => <li key={label}><strong>{label}</strong> · {owner}<p>{description}</p></li>)}</ol>
      </section>
      <section className="panel"><EvaluationProtocol protocol={overview.evaluation_protocol} diagram /></section>
    </>
  );
}
